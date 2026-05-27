import dotenv from "dotenv";
dotenv.config();

import { Response } from "express";
import { Op, Transaction } from "sequelize";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { exportWarehouse } from "../../utils/helper/exportPDF";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { OutboundDetail } from "../../models/warehouse/outboundDetail";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { customerRepository } from "../../repository/customerRepository";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { OutboundHistory } from "../../models/warehouse/outboundHistory";
import { planningHelper } from "../../repository/planning/planningHelper";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { Product } from "../../models/product/product";

const devEnvironment = process.env.NODE_ENV !== "production";
const { outbound } = CacheKey.warehouse;

export const outboundService = {
  getAllOutboundHistory: async (page: number, pageSize: number) => {
    try {
      const cacheKey = outbound.page(page);

      const { isChanged } = await CacheManager.check(OutboundHistory, "outbound");

      if (isChanged) {
        await CacheManager.clear("outbound");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data outbound from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all outbound from cache` };
        }
      }

      const { rows, count } = await warehouseRepository.getOutboundByPage({ page, pageSize });

      const responseData = {
        message: "Get all outbound history successfully",
        data: rows,
        totalOutbounds: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("Failed to get all outbound history:", error);
      throw AppError.ServerError();
    }
  },

  getOutboundDetail: async (outboundId: number) => {
    try {
      if (!outboundId) {
        throw AppError.BadRequest("missing parameters", "INVALID_OUTBOUND_ID");
      }

      const outbound = await warehouseRepository.findByPK(outboundId);
      if (!outbound) {
        throw AppError.NotFound("outbound not found", "OUTBOUND_NOT_FOUND");
      }

      const details = await warehouseRepository.getOutboundDetail(outboundId);

      return { message: "get outbound detail successfully", data: details };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getOutboundByField: async ({
    field,
    keyword,
    page,
    pageSize,
    startDate,
    endDate,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const validFields = ["dateOutbound", "customerName", "outboundSlipCode"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("outbounds");

      let searchKeyword = keyword;
      let filter = [];

      if (field === "dateOutbound") {
        searchKeyword = "";

        if (startDate && endDate) {
          const startTimestamp = dayjsUtc.utc(startDate).startOf("day").unix();
          filter.push(`dateOutbound >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.utc(endDate).endOf("day").unix();
          filter.push(`dateOutbound <= ${endTimestamp}`);
        }

        // console.log(`start: ${startDate} - end: ${endDate}`);
        // console.log(`filter: ${filter.join(" AND ")}`);
      }

      const searchResult = await index.search(searchKeyword, {
        filter: filter.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["outboundId"],
        sort: ["outboundId:desc"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const outboundIds = searchResult.hits.map((hit: any) => hit.outboundId);
      if (outboundIds.length === 0) {
        return {
          message: "No outbound records found",
          data: [],
          totalOutbounds: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      //query db
      const { rows } = await warehouseRepository.getOutboundByPage({
        whereCondition: { outboundId: { [Op.in]: outboundIds } },
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = outboundIds
        .map((id) => rows.find((o) => o.outboundId === id))
        .filter(Boolean);

      return {
        message: "Get outbound records from Meilisearch & DB successfully",
        data: finalData,
        totalOutbounds: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error(`Failed to get outbound history by ${field}:`, error);
      throw AppError.ServerError();
    }
  },

  //use to auto complete
  searchOrderIds: async (keyword: string) => {
    try {
      const orders = await warehouseRepository.searchOrderIds(keyword);

      return { message: "Get orderId suggestions successfully", data: orders };
    } catch (error) {
      console.error("Error search orderIds:", error);
      throw AppError.ServerError();
    }
  },

  //this func use to get planning has qtyProduced > 0
  getOrderInboundQty: async (orderId: string) => {
    try {
      const order = await warehouseRepository.getOrderInboundQty(orderId);
      if (!order) {
        throw AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
      }

      const inventory = await inventoryRepository.findInventoryByOrderId(orderId);

      const remainingQty = inventory?.qtyInventory ?? 0;
      const totalOutbound = inventory?.totalQtyOutbound ?? 0;

      return {
        message: "Get all order inbound quantities successfully",
        data: { ...order.toJSON(), remainingQty, totalOutbound },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createOutbound: async ({
    outboundDetails,
  }: {
    outboundDetails: {
      orderId: string;
      outboundQty: number;
      deliveryItemId?: number;
      isPromotion?: boolean;
    }[];
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!outboundDetails || outboundDetails.length === 0) {
          throw AppError.BadRequest("Phải chọn ít nhất 1 đơn hàng", "EMPTY_ORDER_LIST");
        }

        let customerId: string | null = null;
        let totalPriceOrder = 0;
        let totalPriceVAT = 0;
        let totalPricePayment = 0;
        let totalOutboundQty = 0;
        let timePayment: Date | null = null;

        const preparedDetails: {
          orderId: string;
          outboundQty: number;
          price: number;
          totalPriceOutbound: number;
          deliveredQty: number;
          deliveryItemId?: number;
          isPromotion: boolean;
        }[] = [];

        for (const item of outboundDetails) {
          // check order is exist
          const order = await Order.findByPk(item.orderId, {
            include: [{ model: Product, attributes: ["typeProduct"] }],
            transaction,
          });
          if (!order) {
            throw AppError.NotFound(`Order ${item.orderId} không tồn tại`, "ORDER_NOT_FOUND");
          }

          if (order.Product?.typeProduct !== "Phí Khác") {
            const prefix = item.orderId.slice(0, -3); // Lấy cụm phía trước chữ D

            const feeOrders = await Order.findAll({
              where: { orderId: { [Op.like]: `${prefix}%` } },
              attributes: ["orderId"],
              include: { model: Product, required: true, where: { typeProduct: "Phí Khác" } },
              transaction,
            });

            for (const feeOrder of feeOrders) {
              // Kiểm tra xem mã này đã nằm trong danh sách đang tích chọn xuất kho hay chưa
              const isFeeIncluded = outboundDetails.some(
                (detail) => detail.orderId === feeOrder.orderId,
              );

              if (!isFeeIncluded) {
                const feeInventory = await inventoryRepository.findByOrderId({
                  orderId: feeOrder.orderId,
                  transaction,
                });

                if (feeInventory && feeInventory.qtyInventory >= 1) {
                  throw AppError.BadRequest(
                    `Mã đơn này có phí khác chưa được xuất kèm theo: ${feeOrder.orderId} `,
                    "FEE_ORDER_NOT_INCLUDED",
                  );
                }
              }
            }
          }

          // check customer
          if (customerId === null) {
            customerId = order.customerId;
            const customer = await customerRepository.findCusPaymentByPk(customerId, transaction);

            if (customer && customer.payment) {
              timePayment = customer.payment.timePayment;
            }
          } else if (customerId !== order.customerId) {
            throw AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
          }

          // check inventory
          const inventory = await inventoryRepository.findByOrderId({
            orderId: item.orderId,
            transaction,
          });
          if (!inventory) {
            throw AppError.BadRequest(
              `Order: ${item.orderId} chưa có tồn kho`,
              "INVENTORY_NOT_FOUND",
            );
          }

          //check delivery item is existed
          if (item.deliveryItemId) {
            const outboundDetail = await OutboundDetail.findOne({
              where: { deliveryItemId: item.deliveryItemId },
              transaction,
            });

            if (outboundDetail) {
              throw AppError.BadRequest(
                `Đơn hàng cho lịch giao hàng này đã được xuất ở phiếu khác`,
                "DELIVERY_ITEM_ALREADY_EXISTS",
              );
            }
          }

          //calculate price
          const isPromotion = !!item.isPromotion;
          const price = isPromotion ? 0 : order.pricePaper;
          const totalPriceOutbound = price * item.outboundQty;

          const vatRate = isPromotion ? 0 : (order?.vat ?? 0) / 100;
          const vatAmount = totalPriceOutbound * vatRate;

          const exportedQty = await warehouseRepository.sumOutboundQty({
            orderId: item.orderId,
            transaction,
          });

          totalPriceOrder += totalPriceOutbound;
          totalPriceVAT += vatAmount;
          totalPricePayment += totalPriceOutbound + vatAmount;
          totalOutboundQty += item.outboundQty;

          preparedDetails.push({
            orderId: item.orderId,
            outboundQty: item.outboundQty,
            price,
            totalPriceOutbound,
            deliveredQty: Number(exportedQty ?? 0),
            deliveryItemId: item.deliveryItemId,
            isPromotion,
          });
        }

        // Generate slip code
        const now = new Date();

        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear().toString().slice(-2);
        let number = 1;

        const prefix = `XKBH${year}${month}`;

        const lastOutbound = await OutboundHistory.findOne({
          where: { outboundSlipCode: { [Op.like]: `${prefix}%` } },
          order: [["outboundId", "DESC"]],
          transaction,
        });

        if (lastOutbound && lastOutbound.outboundSlipCode) {
          const lastCode = lastOutbound.outboundSlipCode;
          const lastNumberStr = lastCode.replace(prefix, "");
          const lastNumber = parseInt(lastNumberStr, 10);

          if (!isNaN(lastNumber)) {
            number = lastNumber + 1;
          }
        }

        const slipCode = `${prefix}${number.toString().padStart(4, "0")}`; //XKBH26040001

        // Tạo outbound
        const outbound = await planningHelper.createData({
          model: OutboundHistory,
          data: {
            dateOutbound: now,
            outboundSlipCode: slipCode,
            totalPriceOrder,
            totalPriceVAT,
            totalPricePayment,
            totalOutboundQty,
            dueDate: timePayment,
          },
          transaction,
        });

        // Tạo outbound detail
        for (const item of preparedDetails) {
          await planningHelper.createData({
            model: OutboundDetail,
            data: {
              outboundId: outbound.outboundId,
              orderId: item.orderId,
              outboundQty: item.outboundQty,
              price: item.price,
              totalPriceOutbound: item.totalPriceOutbound,
              deliveredQty: item.deliveredQty,
              deliveryItemId: item.deliveryItemId,
              isPromotion: item.isPromotion,
            },
            transaction,
          });

          await Inventory.increment(
            {
              totalQtyOutbound: item.outboundQty,
              qtyInventory: -item.outboundQty,
              valueInventory: -(item.outboundQty * item.price),
            },
            {
              where: { orderId: item.orderId },
              transaction,
            },
          );
        }

        //--------------------MEILISEARCH-----------------------
        const orderIds = preparedDetails.map((item) => item.orderId);
        await outboundService.syncDataOutbound(outbound.outboundId, orderIds, transaction);

        return outbound;
      });
    } catch (error) {
      console.log("err to create outbound: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateOutbound: async ({
    outboundId,
    outboundDetails,
  }: {
    outboundId: number;
    outboundDetails: {
      orderId: string;
      outboundQty: number;
      deliveryItemId?: number;
      isPromotion?: boolean;
    }[];
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!outboundDetails || outboundDetails.length === 0) {
          throw AppError.BadRequest("Phải chọn ít nhất 1 đơn hàng", "EMPTY_ORDER_LIST");
        }

        const outbound = await OutboundHistory.findByPk(outboundId, {
          include: [{ model: OutboundDetail, as: "detail" }],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!outbound) {
          throw AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
        }

        const oldDetails = outbound.detail ?? [];
        const oldDetailMap = new Map<string, OutboundDetail>();
        for (const detail of oldDetails) {
          oldDetailMap.set(detail.orderId, detail);
        }

        let customerId: string | null = null;
        let timePayment: Date | null = null;
        let totalPriceOrder = 0;
        let totalPriceVAT = 0;
        let totalPricePayment = 0;
        let totalOutboundQty = 0;

        const handledOrderIds = new Set<string>();

        // UPDATE
        for (const item of outboundDetails) {
          const order = await Order.findByPk(item.orderId, { transaction });
          if (!order) {
            throw AppError.NotFound(`Order ${item.orderId} không tồn tại`, "ORDER_NOT_FOUND");
          }

          // check customer
          if (customerId === null) {
            customerId = order.customerId;
            const customer = await customerRepository.findCusPaymentByPk(customerId, transaction);

            if (customer && customer.payment) {
              timePayment = customer.payment.timePayment;
            }
          } else if (customerId !== order.customerId) {
            throw AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
          }

          // check delivery item is existed
          if (item.deliveryItemId) {
            const duplicateCheck = await OutboundDetail.findOne({
              where: {
                deliveryItemId: item.deliveryItemId,
                outboundId: { [Op.ne]: outboundId }, // Không phải phiếu hiện tại
              },
              transaction,
            });
            if (duplicateCheck) {
              throw AppError.BadRequest(
                `Đơn hàng cho lịch giao hàng này đã được xuất ở phiếu khác`,
                "DELIVERY_ITEM_ALREADY_EXISTS",
              );
            }
          }

          //check tồn kho
          const inventory = await inventoryRepository.findByOrderId({
            orderId: item.orderId,
            transaction,
          });
          if (!inventory) {
            throw AppError.BadRequest(
              `Order ${item.orderId} chưa có tồn kho`,
              "INVENTORY_NOT_FOUND",
            );
          }

          const oldDetail = oldDetailMap.get(item.orderId);

          // Logic giá & khuyến mãi
          const isPromotion = !!item.isPromotion;
          const currentPrice = isPromotion ? 0 : order.pricePaper;
          const currentTotalPrice = currentPrice * item.outboundQty;

          // Tính delta kho
          const oldQty = oldDetail ? oldDetail.outboundQty : 0;
          const oldPrice = oldDetail ? oldDetail.price : 0;
          const deltaQty = item.outboundQty - oldQty;
          const deltaValue = currentTotalPrice - oldPrice * oldQty;

          // cập nhật tồn kho theo delta
          if (deltaQty !== 0) {
            await Inventory.increment(
              {
                totalQtyOutbound: deltaQty,
                qtyInventory: -deltaQty,
                valueInventory: -deltaValue,
              },
              { where: { orderId: item.orderId }, transaction },
            );
          }

          const vatRate = isPromotion ? 0 : (order.vat ?? 0) / 100;
          const vatAmount = currentTotalPrice * vatRate;

          totalPriceOrder += currentTotalPrice;
          totalPriceVAT += vatAmount;
          totalPricePayment += currentTotalPrice + vatAmount;
          totalOutboundQty += item.outboundQty;

          if (oldDetail) {
            await oldDetail.update(
              {
                outboundQty: item.outboundQty,
                price: currentPrice,
                totalPriceOutbound: currentTotalPrice,
                deliveryItemId: item.deliveryItemId,
                isPromotion: isPromotion,
              },
              { transaction },
            );
          } else {
            const exportedQty = await warehouseRepository.sumOutboundQtyExcludeOutbound({
              orderId: item.orderId,
              outboundId,
              transaction,
            });

            await OutboundDetail.create(
              {
                outboundId,
                orderId: item.orderId,
                outboundQty: item.outboundQty,
                price: currentPrice,
                totalPriceOutbound: currentTotalPrice,
                deliveredQty: Number(exportedQty ?? 0),
                deliveryItemId: item.deliveryItemId,
                isPromotion: isPromotion,
              },
              { transaction },
            );
          }

          handledOrderIds.add(item.orderId);
        }

        // XỬ LÝ DELETE đơn bị xóa khỏi phiếu
        for (const oldDetail of oldDetails) {
          if (!handledOrderIds.has(oldDetail.orderId)) {
            const inv = await inventoryRepository.findByOrderId({
              orderId: oldDetail.orderId,
              transaction,
            });

            // hoàn kho
            if (inv) {
              await Inventory.increment(
                {
                  totalQtyOutbound: -oldDetail.outboundQty,
                  qtyInventory: oldDetail.outboundQty,
                  valueInventory: oldDetail.outboundQty * oldDetail.price,
                },
                { where: { orderId: oldDetail.orderId }, transaction },
              );
            }

            await oldDetail.destroy({ transaction });
          }
        }

        // Cập nhật outbound header
        const finalDueDate = timePayment || outbound.dueDate;

        await outbound.update(
          {
            totalPriceOrder,
            totalPriceVAT,
            totalPricePayment,
            totalOutboundQty,
            dueDate: finalDueDate,
          },
          { transaction },
        );

        //--------------------MEILISEARCH-----------------------
        // Thu thập TẤT CẢ orderId bị ảnh hưởng (bao gồm đơn hàng trong đợt update này VÀ đơn hàng cũ có thể đã bị xóa)
        const currentOrderIds = outboundDetails.map((item) => item.orderId);
        const oldOrderIds = oldDetails.map((detail) => detail.orderId);

        // Gộp mảng và sử dụng Set để loại bỏ các orderId trùng lặp
        const affectedOrderIds = [...new Set([...currentOrderIds, ...oldOrderIds])];

        await outboundService.syncDataOutbound(outboundId, affectedOrderIds, transaction);

        return outbound;
      });
    } catch (error) {
      console.log("err to update outbound: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  syncDataOutbound: async (
    outboundId: number,
    orderIds: string | string[],
    transaction: Transaction,
  ) => {
    try {
      const [outbound, inventories] = await Promise.all([
        warehouseRepository.syncOutboundForMeili(outboundId, transaction),
        inventoryRepository.syncAllInventoryToMeili(
          Array.isArray(orderIds) ? orderIds : [orderIds],
          transaction,
        ),
      ]);

      const meiliFormatted = meiliTransformer.outbound(outbound);
      const flattenInventory = inventories.map(meiliTransformer.inventory);

      await meiliService.syncOrUpdateMeiliData({
        indexKey: MEILI_INDEX.OUTBOUNDS,
        data: meiliFormatted,
        transaction,
      });
      await meiliService.syncOrUpdateMeiliData({
        indexKey: MEILI_INDEX.INVENTORIES,
        data: flattenInventory,
        transaction,
      });
    } catch (error) {
      console.log("err to sync data outbound: ", error);
      throw AppError.ServerError();
    }
  },

  deleteOutbound: async (outboundId: number) => {
    try {
      return await runInTransaction(async (transaction) => {
        const outbound = await OutboundHistory.findByPk(outboundId, {
          include: [{ model: OutboundDetail, as: "detail" }],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!outbound) {
          throw AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
        }

        const details = outbound.detail ?? [];

        // Hoàn kho cho từng order
        for (const detail of details) {
          await Inventory.increment(
            {
              totalQtyOutbound: -detail.outboundQty,
              qtyInventory: detail.outboundQty,
              valueInventory: detail.outboundQty * detail.price,
            },
            {
              where: { orderId: detail.orderId },
              transaction,
            },
          );
        }

        // Xóa outbound detail
        await OutboundDetail.destroy({
          where: { outboundId },
          transaction,
        });

        // Xóa outbound history
        await outbound.destroy({ transaction });

        //--------------------MEILISEARCH-----------------------
        await meiliService.deleteMeiliData(MEILI_INDEX.OUTBOUNDS, outboundId, transaction);

        //update inventory in meilisearch
        const orderIds = details.map((d) => d.orderId);

        if (orderIds.length > 0) {
          const updatedInvs = await inventoryRepository.syncAllInventoryToMeili(
            orderIds,
            transaction,
          );

          const flattenInventory = updatedInvs.map(meiliTransformer.inventory);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.INVENTORIES,
            data: flattenInventory,
            transaction,
          });
        }

        return { message: "Hủy phiếu xuất kho thành công" };
      });
    } catch (error) {
      console.log("err to delete outbound: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportFileOutbound: async (res: Response, outboundId: number, hasMoney: boolean) => {
    try {
      await exportWarehouse(res, outboundId, hasMoney);
    } catch (error) {
      console.error("Error export file outbound:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
