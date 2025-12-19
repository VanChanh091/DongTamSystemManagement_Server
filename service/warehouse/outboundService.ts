import dotenv from "dotenv";
import { CacheManager } from "../../utils/helper/cacheManager";
import { AppError } from "../../utils/appError";
import { OutboundHistory } from "../../models/warehouse/outboundHistory";
import { getOutboundByField } from "../../utils/helper/modelHelper/warehouseHelper";
import redisCache from "../../configs/redisCache";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { OutboundDetail } from "../../models/warehouse/outboundDetail";
import { Order } from "../../models/order/order";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { planningRepository } from "../../repository/planningRepository";
import { runInTransaction } from "../../utils/helper/transactionHelper";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { outbound } = CacheManager.keys.warehouse;

export const outboundService = {
  getAllOutboundHistory: async (page: number, pageSize: number) => {
    try {
      // const cacheKey = outbound.page(page);

      // const { isChanged } = await CacheManager.check(OutboundHistory, "outbound");

      // if (isChanged) {
      //   await CacheManager.clearOutbound();
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ Data outbound from Redis");
      //     const parsed = JSON.parse(cachedData);
      //     return { ...parsed, message: `Get all outbound from cache` };
      //   }
      // }

      const totalOutbounds = await warehouseRepository.outboundHistoryCount();
      const totalPages = Math.ceil(totalOutbounds / pageSize);
      const data = await warehouseRepository.getOutboundByPage({ page, pageSize });

      const responseData = {
        message: "Get all outbound history successfully",
        data,
        totalOutbounds,
        totalPages,
        currentPage: page,
      };

      // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

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
        throw AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
      }

      const details = await warehouseRepository.getOutboundDetail(outboundId);

      return { message: "get outbound detail successfully", data: details };
    } catch (error) {
      console.error("Failed to get all outbound detail:", error);
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
          throw AppError.BadRequest("Phải chọn ít nhất 1 đơn hàng", "EMPTY_ORDER_LIST");
        }

        let customerId: string | null = null;
        let totalPriceOrder = 0;
        let totalPriceVAT = 0;
        let totalPricePayment = 0;
        let totalOutboundQty = 0;

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

          // check inbound
          const inbound = await warehouseRepository.findByOrderId({
            orderId: item.orderId,
            transaction,
          });
          if (!inbound) {
            throw AppError.BadRequest(`Order ${item.orderId} chưa nhập kho`, "ORDER_NOT_INBOUND");
          }

          // check customer
          if (customerId === null) {
            customerId = order.customerId;
          } else if (customerId !== order.customerId) {
            throw AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
          }

          // check xuất vượt số lượng order
          const exportedQty = await warehouseRepository.sumOutboundQty({
            orderId: item.orderId,
            transaction,
          });

          const deliveredQty = Number(exportedQty ?? 0);
          if (deliveredQty + item.outboundQty > order.quantityCustomer) {
            throw AppError.BadRequest(
              `Xuất vượt số lượng cho order ${item.orderId}`,
              "OUTBOUND_QTY_EXCEED"
            );
          }

          //total price for outbound detail
          const totalPriceOutbound = order.price * item.outboundQty;

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
            price: order.price,
            totalPriceOutbound,
            deliveredQty,
          });
        }

        // Generate slip code
        const now = new Date();
        const slipCode = `XK/${now.getDate()}/${now.getMonth() + 1}/${now
          .getFullYear()
          .toString()
          .slice(-2)}`;

        // Tạo outbound
        const outbound = await planningRepository.createData({
          model: OutboundHistory,
          data: {
            dateOutbound: now,
            outboundSlipCode: slipCode,
            totalPriceOrder,
            totalPriceVAT,
            totalPricePayment,
            totalOutboundQty,
          },
          transaction,
        });

        // 4️⃣ Tạo outbound detail
        for (const item of preparedDetails) {
          await planningRepository.createData({
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
        }

        return outbound;
      });
    } catch (error) {
      console.error("Error create outbound:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  searchOutboundByField: async ({
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
      // const fieldMap = {
      //   outboundSlipCode: (outbound: OutboundHistory) => outbound.orderId,
      //   dateOutbound: (outbound: OutboundHistory) => outbound.dateOutbound,
      //   companyName: (outbound: OutboundHistory) => outbound.Order.Customer.companyName,
      //   productName: (outbound: OutboundHistory) => outbound.Order.Product.productName,
      // } as const;
      // const key = field as keyof typeof fieldMap;
      // if (!fieldMap[key]) {
      //   throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      // }
      // const result = await getOutboundByField({
      //   keyword: keyword,
      //   getFieldValue: fieldMap[key],
      //   page,
      //   pageSize,
      //   message: `get all by ${field} from filtered cache`,
      // });
      // return result;
    } catch (error) {
      console.error(`Failed to get outbound history by ${field}:`, error);
      throw AppError.ServerError();
    }
  },

  exportFileOutbound: async () => {
    try {
      return await runInTransaction(async (transaction) => {});
    } catch (error) {
      console.error("Error export file outbound:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
