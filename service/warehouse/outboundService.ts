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

      const outbound = await OutboundHistory.findByPk(outboundId, {
        attributes: ["outboundId"],
      });
      if (!outbound) {
        throw AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
      }

      const details = await warehouseRepository.getOutboundDetail(outboundId);

      return details;
    } catch (error) {
      console.error("Failed to get all outbound detail:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createOutbound: async ({
    outboundQty,
    orderIds,
  }: {
    outboundQty: number;
    orderIds: string[];
  }) => {
    const transaction = await OutboundHistory.sequelize?.transaction();

    // try {
    //   if (!orderIds || orderIds.length === 0) {
    //     throw AppError.BadRequest("Phải chọn ít nhất 1 đơn hàng", "EMPTY_ORDER_LIST");
    //   }

    //   let customerId: string | null = null;
    //   let totalPriceOrder = 0;
    //   let totalVAT = 0;
    //   let totalPricePayment = 0;
    //   let deliveredQty = 0;

    //   // Validate order + inbound + customer
    //   for (const orderId of orderIds) {
    //     const order = await Order.findByPk(orderId, { transaction });
    //     if (!order) {
    //       throw AppError.NotFound(`Order ${orderId} không tồn tại`, "ORDER_NOT_FOUND");
    //     }

    //     // const inbound = await InboundHistory.findOne({
    //     //   where: { orderId },
    //     //   transaction,
    //     // });
    //     // if (!inbound) {
    //     //   throw AppError.BadRequest(`Order ${orderId} chưa nhập kho`, "ORDER_NOT_INBOUND");
    //     // }

    //     if (customerId === null) {
    //       customerId = order.customerId;
    //     } else if (customerId !== order.customerId) {
    //       throw AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
    //     }

    //     const oldOutboundDetails = await OutboundDetail.findAll({
    //       where: { orderId },
    //       attributes: ["outboundId"],
    //       transaction,
    //     });

    //     if (oldOutboundDetails.length > 0) {
    //       const outboundIds = oldOutboundDetails.map((d) => d.outboundId);

    //       const sumQty = await OutboundHistory.sum("outboundQty", {
    //         where: { outboundId: outboundIds },
    //         transaction,
    //       });

    //       deliveredQty += Number(sumQty ?? 0);
    //     }

    //     totalPriceOrder += order.totalPrice ?? 0;
    //     totalVAT += order.vat ?? 0;
    //     totalPricePayment += order.totalPriceVAT ?? 0;
    //   }

    //   // Generate slip code
    //   const now = new Date();
    //   const slipCode = `XK/${now.getDate()}/${now.getMonth() + 1}/${now
    //     .getFullYear()
    //     .toString()
    //     .slice(-2)}`;

    //   // Tạo outbound
    //   const outbound = await OutboundHistory.create(
    //     {
    //       dateOutbound: now,
    //       outboundSlipCode: slipCode,
    //       outboundQty,
    //       deliveredQty,
    //       totalPriceOrder,
    //       totalVAT,
    //       totalPricePayment,
    //     },
    //     { transaction }
    //   );

    //   // 4️⃣ Tạo outbound detail
    //   for (const orderId of orderIds) {
    //     await OutboundDetail.create(
    //       {
    //         outboundId: outbound.outboundId,
    //         orderId,
    //       },
    //       { transaction }
    //     );
    //   }

    //   await transaction?.commit();
    //   return outbound;
    // } catch (error) {
    //   await transaction?.rollback();
    //   console.error("Error create outbound:", error);
    //   if (error instanceof AppError) throw error;
    //   throw AppError.ServerError();
    // }
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
    } catch (error) {
      // await transaction?.rollback();
      console.error("Error export file outbound:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
