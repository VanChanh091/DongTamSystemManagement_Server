import dotenv from "dotenv";
dotenv.config();

import { AppError } from "../../utils/appError";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { manufactureRepository } from "../../repository/manufactureRepository";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { planningRepository } from "../../repository/planningRepository";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { CacheManager } from "../../utils/helper/cacheManager";
import redisCache from "../../configs/redisCache";
import { getInboundByField } from "../../utils/helper/modelHelper/warehouseHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { inbound } = CacheManager.keys.warehouse;

export const inboundService = {
  //====================================CHECK AND INBOUND QTY========================================

  getPaperWaitingChecked: async () => {
    try {
      const planning = await warehouseRepository.getPaperWaitingChecked();

      const allPlannings: any[] = [];
      const overflowRemoveFields = ["runningPlan", "quantityManufacture"];

      planning.forEach((planning) => {
        const original = {
          ...planning.toJSON(),
          timeRunning: planning.timeRunning,
          dayStart: planning.dayStart,
        };
        allPlannings.push(original);

        if (planning.timeOverFlow) {
          const overflow: any = { ...planning.toJSON() };

          overflow.isOverflow = true;
          overflow.dayStart = planning.timeOverFlow.overflowDayStart;
          overflow.timeRunning = planning.timeOverFlow.overflowTimeRunning;
          overflow.dayCompleted = planning.timeOverFlow.overflowDayCompleted;

          overflowRemoveFields.forEach((f) => delete overflow[f]);
          if (overflow.Order) {
            ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach(
              (item) => delete overflow.Order[item]
            );
          }

          allPlannings.push(overflow);
        }
      });

      return { message: `get planning paper waiting check`, data: allPlannings };
    } catch (error) {
      console.error("Failed to get paper waiting checked:", error);
      throw AppError.ServerError();
    }
  },

  getBoxWaitingChecked: async () => {
    try {
      const planning = await warehouseRepository.getBoxWaitingChecked();

      const allPlannings: any[] = [];

      planning.forEach((planning) => {
        const original = {
          ...planning.toJSON(),
          dayStart: planning.boxTimes?.[0]?.dayStart,
        };

        // Chỉ push nếu dayStart khác null
        if (original.dayStart !== null) {
          delete original.dayStart;
          allPlannings.push(original);
        }

        if (planning.timeOverFlow && planning.timeOverFlow.length > 0) {
          planning.timeOverFlow.forEach((of) => {
            const overflowPlanning = {
              ...original,
              boxTimes: (planning.boxTimes || []).map((bt) => ({
                ...bt.dataValues,
                dayStart: of.overflowDayStart,
                dayCompleted: of.overflowDayCompleted,
                timeRunning: of.overflowTimeRunning,
              })),
            };
            allPlannings.push(overflowPlanning);
          });
        }

        return allPlannings;
      });

      return { message: `get planning by machine waiting check`, data: allPlannings };
    } catch (error) {
      console.error("Failed to get box waiting checked", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //inbound paper
  inboundQtyPaper: async (planningId: number, inboundQty: number) => {
    const transaction = await PlanningPaper.sequelize?.transaction();

    try {
      const planning = await manufactureRepository.getPapersById(planningId, transaction);
      if (!planning) {
        throw AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
      }

      const totalInboundQty =
        (await InboundHistory.sum("qtyInbound", {
          where: { orderId: planning.orderId },
        })) ?? 0;
      const producedQty = planning.qtyProduced ?? 0;

      if (totalInboundQty + inboundQty > producedQty) {
        throw AppError.BadRequest(
          "Số lượng nhập kho vượt quá số lượng sản xuất",
          "INBOUND_EXCEED_PRODUCED"
        );
      }

      const inboundRecord = await planningRepository.createData({
        model: InboundHistory,
        data: {
          dateInbound: new Date(),
          qtyPaper: planning.qtyProduced,
          qtyInbound: inboundQty,

          orderId: planning.orderId,
        },
        transaction,
      });

      await transaction?.commit();

      return {
        message: "Confirm producing paper successfully",
        data: inboundRecord,
      };
    } catch (error) {
      await transaction?.rollback();
      console.error("Error inbound paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //inbound box
  inboundQtyBox: async (planningBoxId: number, inboundQty: number) => {
    const transaction = await PlanningBox.sequelize?.transaction();

    try {
      const planning = await planningRepository.getModelById({
        model: PlanningBox,
        where: { planningBoxId },
        options: {
          include: [{ model: PlanningBoxTime, as: "boxtimes", where: { planningBoxId } }],
          transaction,
          lock: transaction?.LOCK.UPDATE,
        },
      });

      if (!planning) {
        throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
      }

      const totalInboundQty =
        (await InboundHistory.sum("qtyInbound", {
          where: { orderId: planning.orderId },
        })) ?? 0;
      const producedQty = planning.qtyProduced ?? 0;

      if (totalInboundQty + inboundQty > producedQty) {
        throw AppError.BadRequest(
          "Số lượng nhập kho vượt quá số lượng sản xuất",
          "INBOUND_EXCEED_PRODUCED"
        );
      }

      const inboundRecord = await planningRepository.createData({
        model: InboundHistory,
        data: {
          dateInbound: new Date(),
          qtyPaper: planning.PlanningPaper.qtyProduced,
          qtyInbound: inboundQty,

          orderId: planning.orderId,
        },
        transaction,
      });

      await transaction?.commit();

      return {
        message: "Confirm producing paper successfully",
        data: inboundRecord,
      };
    } catch (error) {
      await transaction?.rollback();
      console.error("Error inbound box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //====================================INBOUND HISTORY========================================

  getAllInboundHistory: async (page: number, pageSize: number) => {
    try {
      const cacheKey = inbound.page(page);

      const { isChanged } = await CacheManager.check(InboundHistory, "inbound");

      if (isChanged) {
        await CacheManager.clearInbound();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data inbound from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all inbound from cache` };
        }
      }

      const totalInbounds = await warehouseRepository.inboundHistoryCount();
      const totalPages = Math.ceil(totalInbounds / pageSize);
      const data = await warehouseRepository.findInboundByPage({ page, pageSize });

      const responseData = {
        message: "Get all inbound history successfully",
        data,
        totalInbounds,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("get all inbound history failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  searchInboundByField: async ({
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
        orderId: (inbound: InboundHistory) => inbound.orderId,
        customerName: (inbound: InboundHistory) => inbound.Order.Customer.customerName,
        companyName: (inbound: InboundHistory) => inbound.Order.Customer.companyName,
        productName: (inbound: InboundHistory) => inbound.Order.Product.productName,
      } as const;

      const key = field as keyof typeof fieldMap;
      if (!fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      const result = await getInboundByField({
        keyword: keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
      });

      return result;
    } catch (error) {
      console.error(`get inbound history by ${field} failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
