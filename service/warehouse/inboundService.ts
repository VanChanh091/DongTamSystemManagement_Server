import dotenv from "dotenv";
dotenv.config();

import redisCache from "../../assest/configs/redisCache";
import { AppError } from "../../utils/appError";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { manufactureRepository } from "../../repository/manufactureRepository";
import { planningRepository } from "../../repository/planningRepository";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { CacheManager } from "../../utils/helper/cacheManager";
import { getInboundByField } from "../../utils/helper/modelHelper/warehouseHelper";
import { dashboardRepository } from "../../repository/dashboardRepository";
import { buildStagesDetails } from "../../utils/helper/modelHelper/planningHelper";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { inventoryService } from "./inventoryService";
import { Inventory } from "../../models/warehouse/inventory";
import { Order } from "../../models/order/order";
import { CacheKey } from "../../utils/helper/cache/cacheKey";

const devEnvironment = process.env.NODE_ENV !== "production";
const { inbound } = CacheKey.warehouse;

export const inboundService = {
  //====================================WAITING CHECK AND INBOUND QTY========================================

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
              (item) => delete overflow.Order[item],
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

      return { message: `get planning by machine waiting check`, data: planning };
    } catch (error) {
      console.error("Failed to get box waiting checked", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getBoxCheckedDetail: async (planningBoxId: number) => {
    try {
      //get data detail
      const detail = await warehouseRepository.getBoxCheckedDetail(planningBoxId);
      if (!detail) {
        throw AppError.NotFound("detail not found", "DETAIL_NOT_FOUND");
      }

      const stages = await buildStagesDetails({
        detail,
        getBoxTimes: (d) => d.boxTimes,
        getPlanningBoxId: (d) => d.planningBoxId,
        getAllOverflow: (id) => dashboardRepository.getAllTimeOverflow(id),
      });

      return { message: "get db planning detail succesfully", data: stages };
    } catch (error) {
      console.error("Failed to get box waiting checked", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //inbound paper
  inboundQtyPaper: async ({
    planningId,
    inboundQty,
    qcSessionId,
    transaction,
  }: {
    planningId: number;
    inboundQty: number;
    qcSessionId: number;
    transaction?: any;
  }) => {
    try {
      const planning = await manufactureRepository.getPapersById(planningId, transaction);
      if (!planning) {
        throw AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
      }

      const totalInboundQty =
        (await InboundHistory.sum("qtyInbound", {
          where: { planningId: planning.planningId },
        })) ?? 0;

      const qtyProduced = planning.qtyProduced ?? 0;
      if (totalInboundQty + inboundQty > qtyProduced) {
        throw AppError.BadRequest(
          "Số lượng nhập kho vượt quá số lượng sản xuất",
          "INBOUND_EXCEED_PRODUCED",
        );
      }

      const isFirstInbound = totalInboundQty === 0;

      //create inventory
      await inventoryService.createNewInventory(planning.orderId, transaction);

      const inboundRecord = await planningRepository.createData({
        model: InboundHistory,
        data: {
          dateInbound: new Date(),
          qtyPaper: qtyProduced,
          qtyInbound: inboundQty,

          orderId: planning.orderId,
          planningId,
          qcSessionId,
        },
        transaction,
      });

      //update inventory
      await Inventory.increment(
        {
          totalQtyInbound: inboundQty,
          qtyInventory: inboundQty,
          valueInventory: inboundQty * planning.Order.pricePaper,
        },
        {
          where: { orderId: planning.orderId },
          transaction,
        },
      );

      if (isFirstInbound) {
        await planning.update({ statusRequest: "inbounded" }, { transaction });
      }

      return {
        message: "Confirm producing paper successfully",
        data: inboundRecord,
      };
    } catch (error) {
      console.error("Error inbound paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //inbound box
  inboundQtyBox: async ({
    planningBoxId,
    inboundQty,
    qcSessionId,
    transaction,
  }: {
    planningBoxId: number;
    inboundQty: number;
    qcSessionId: number;
    transaction?: any;
  }) => {
    try {
      const planning = await planningRepository.getModelById({
        model: PlanningBox,
        where: { planningBoxId },
        options: {
          include: [
            { model: PlanningBoxTime, as: "boxTimes", where: { planningBoxId, isRequest: true } },
            { model: Order, attributes: ["quantityCustomer", "pricePaper"] },
          ],
          transaction,
          lock: transaction?.LOCK.UPDATE,
        },
      });
      if (!planning) {
        throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
      }

      const totalInboundQty =
        (await InboundHistory.sum("qtyInbound", {
          where: { planningBoxId: planning.planningBoxId },
        })) ?? 0;

      const qtyProduced = planning.boxTimes?.[0].qtyProduced ?? 0;
      if (totalInboundQty + inboundQty > qtyProduced) {
        throw AppError.BadRequest(
          "Số lượng nhập kho vượt quá số lượng sản xuất",
          "INBOUND_EXCEED_PRODUCED",
        );
      }

      const isFirstInbound = totalInboundQty === 0;

      //create inventory
      await inventoryService.createNewInventory(planning.orderId, transaction);

      const inboundRecord = await planningRepository.createData({
        model: InboundHistory,
        data: {
          dateInbound: new Date(),
          qtyPaper: planning.qtyPaper,
          qtyInbound: inboundQty,

          orderId: planning.orderId,
          planningBoxId,
          qcSessionId,
        },
        transaction,
      });

      //update inventory
      await Inventory.increment(
        {
          totalQtyInbound: inboundQty,
          qtyInventory: inboundQty,
          valueInventory: inboundQty * planning.Order.pricePaper,
        },
        {
          where: { orderId: planning.orderId },
          transaction,
        },
      );

      if (isFirstInbound) {
        await planning.update({ statusRequest: "inbounded" }, { transaction });

        const paper = await PlanningPaper.findOne({
          where: { planningId: planning.planningId },
          attributes: ["planningId", "statusRequest"],
        });
        if (!paper) {
          throw AppError.BadRequest("planning paper not found", "PLANNING_PAPER_NOT_FOUND");
        }

        await paper.update({ statusRequest: "inbounded" }, { transaction });
      }

      return {
        message: "Confirm producing paper successfully",
        data: inboundRecord,
      };
    } catch (error) {
      console.error("Error inbound box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //====================================INBOUND HISTORY========================================

  getAllInboundHistory: async (page: number, pageSize: number) => {
    const cacheKey = inbound.page(page);

    try {
      const { isChanged } = await CacheManager.check(InboundHistory, "inbound");

      if (isChanged) {
        await CacheManager.clear("inbound");
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
