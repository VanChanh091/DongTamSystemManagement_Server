import dotenv from "dotenv";
import { CacheManager } from "../../utils/helper/cacheManager";
import { AppError } from "../../utils/appError";
import { OutboundHistory } from "../../models/warehouse/outboundHistory";
import { getOutboundByField } from "../../utils/helper/modelHelper/warehouseHelper";
import redisCache from "../../configs/redisCache";
import { warehouseRepository } from "../../repository/warehouseRepository";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { outbound } = CacheManager.keys.warehouse;

export const outboundService = {
  getAllOutboundHistory: async (page: number, pageSize: number) => {
    try {
      const cacheKey = outbound.page(page);

      const { isChanged } = await CacheManager.check(OutboundHistory, "outbound");

      if (isChanged) {
        await CacheManager.clearOutbound();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data outbound from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all outbound from cache` };
        }
      }

      const totalOutbounds = await warehouseRepository.outboundHistoryCount();
      const totalPages = Math.ceil(totalOutbounds / pageSize);
      const data = await warehouseRepository.findOutboundByPage({ page, pageSize });

      const responseData = {
        message: "Get all outbound history successfully",
        data,
        totalOutbounds,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("Failed to get all outbound history:", error);
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
      const fieldMap = {
        outboundSlipCode: (outbound: OutboundHistory) => outbound.orderId,
        dateOutbound: (outbound: OutboundHistory) => outbound.dateOutbound,
        companyName: (outbound: OutboundHistory) => outbound.Order.Customer.companyName,
        productName: (outbound: OutboundHistory) => outbound.Order.Product.productName,
      } as const;

      const key = field as keyof typeof fieldMap;
      if (!fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      const result = await getOutboundByField({
        keyword: keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
      });

      return result;
    } catch (error) {
      console.error(`Failed to get outbound history by ${field}:`, error);
      throw AppError.ServerError();
    }
  },
};
