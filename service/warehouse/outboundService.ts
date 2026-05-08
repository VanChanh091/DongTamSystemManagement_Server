import dotenv from "dotenv";
dotenv.config();

import { Response } from "express";
import { Op, Transaction } from "sequelize";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { exportWarehouse } from "../../utils/helper/exportPDF";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { OutboundDetail } from "../../models/warehouse/outboundDetail";
import { customerRepository } from "../../repository/customerRepository";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { OutboundHistory } from "../../models/warehouse/outboundHistory";
import { planningHelper } from "../../repository/planning/planningHelper";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";

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
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
  }) => {
    try {
      const validFields = ["dateOutbound", "customerName", "outboundSlipCode"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      if (field === "dateOutbound") {
        const date = new Date(keyword);
        if (!isNaN(date.getTime())) {
          keyword = Math.floor(date.setUTCHours(0, 0, 0, 0) / 1000).toString();
        }
      }

      const index = meiliClient.index("outbounds");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["outboundId"],
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
    outboundDetails: { orderId: string; outboundQty: number }[];
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!outboundDetails || outboundDetails.length === 0) {
          throw AppError.BadRequest("empty order list", "EMPTY_ORDER_LIST");
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
        }[] = [];

        for (const item of outboundDetails) {
          // check order is exist
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
            throw AppError.BadRequest("customer missmatch", "CUSTOMER_MISMATCH");
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

          if (inventory.qtyInventory < item.outboundQty) {
            throw AppError.BadRequest(
              `Xuất vượt tồn kho cho order ${item.orderId}`,
              "OUTBOUND_EXCEED_INVENTORY",
            );
          }

          // check xuất vượt số lượng order
          const exportedQty = await warehouseRepository.sumOutboundQty({
            orderId: item.orderId,
            transaction,
          });

          const deliveredQty = Number(exportedQty ?? 0);

          //total price for outbound detail
          const totalPriceOutbound = order.pricePaper * item.outboundQty;

          // outbound history
          const vatRate = (order?.vat ?? 0) / 100;
          const vatAmount = totalPriceOutbound * vatRate;

          totalPriceOrder += totalPriceOutbound;
          totalPriceVAT += vatAmount;
          totalPricePayment += totalPriceOutbound + vatAmount;
          totalOutboundQty += item.outboundQty;

          preparedDetails.push({
            orderId: item.orderId,
            outboundQty: item.outboundQty,
            price: order.pricePaper,
            totalPriceOutbound,
            deliveredQty,
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
        await outboundService.syncDataOutbound(outbound.outboundId, transaction);

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
    outboundDetails: { orderId: string; outboundQty: number }[];
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!outboundDetails || outboundDetails.length === 0) {
          throw AppError.BadRequest("Danh sách đơn hàng trống", "EMPTY_ORDER_LIST");
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
          const oldQty = oldDetail ? oldDetail.outboundQty : 0;
          const deltaQty = item.outboundQty - oldQty;

          // check tồn kho nếu xuất thêm
          if (deltaQty > 0 && inventory.qtyInventory < deltaQty) {
            throw AppError.BadRequest(
              `Xuất vượt tồn kho cho order ${item.orderId}`,
              "OUTBOUND_EXCEED_INVENTORY",
            );
          }

          // check vượt số lượng bán
          const exportedQty = await warehouseRepository.sumOutboundQtyExcludeOutbound({
            orderId: item.orderId,
            outboundId,
            transaction,
          });

          const deliveredQty = Number(exportedQty ?? 0);

          // cập nhật tồn kho theo delta
          if (deltaQty !== 0) {
            await Inventory.increment(
              {
                totalQtyOutbound: deltaQty,
                qtyInventory: -deltaQty,
                valueInventory: -(deltaQty * order.pricePaper),
              },
              { where: { orderId: item.orderId }, transaction },
            );
          }

          const totalPriceOutbound = order.pricePaper * item.outboundQty;
          const vatRate = (order.vat ?? 0) / 100;
          const vatAmount = totalPriceOutbound * vatRate;

          totalPriceOrder += totalPriceOutbound;
          totalPriceVAT += vatAmount;
          totalPricePayment += totalPriceOutbound + vatAmount;
          totalOutboundQty += item.outboundQty;

          if (oldDetail) {
            // UPDATE
            await oldDetail.update(
              {
                outboundQty: item.outboundQty,
                price: order.pricePaper,
                totalPriceOutbound,
              },
              { transaction },
            );
          } else {
            // ADD
            await OutboundDetail.create(
              {
                outboundId,
                orderId: item.orderId,
                outboundQty: item.outboundQty,
                price: order.pricePaper,
                totalPriceOutbound,
                deliveredQty,
              },
              { transaction },
            );
          }

          handledOrderIds.add(item.orderId);
        }

        // XỬ LÝ DELETE đơn bị xóa khỏi phiếu
        for (const oldDetail of oldDetails) {
          if (!handledOrderIds.has(oldDetail.orderId)) {
            // hoàn kho
            await Inventory.increment(
              {
                totalQtyOutbound: -oldDetail.outboundQty,
                qtyInventory: oldDetail.outboundQty,
                valueInventory: oldDetail.outboundQty * oldDetail.price,
              },
              { where: { orderId: oldDetail.orderId }, transaction },
            );

            await oldDetail.destroy({ transaction });
          }
        }

        const finalDueDate = timePayment || outbound.dueDate;

        // Cập nhật outbound header
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
        await outboundService.syncDataOutbound(outboundId, transaction);

        return outbound;
      });
    } catch (error) {
      console.log("err to update outbound: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  syncDataOutbound: async (outboundId: number, transaction: Transaction) => {
    try {
      const outboundData = await warehouseRepository.getOutboundForMeili(outboundId, transaction);

      if (outboundData) {
        const meiliFormatted = meiliTransformer.outbound(outboundData);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.OUTBOUNDS,
          data: meiliFormatted,
          transaction,
        });
      }
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
