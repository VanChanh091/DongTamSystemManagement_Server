import dotenv from "dotenv";
dotenv.config();

import dayjs from "dayjs";
import { Op, Transaction } from "sequelize";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { inventoryService } from "./inventoryService";
import { MEILI_INDEX } from "../../assets/labelFields";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningPaper } from "../../models/planning/planningPaper";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { manufactureRepo } from "../../repository/manufactureRepository";
import { planningHelper } from "../../repository/planning/planningHelper";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { syntheticRepository } from "../../repository/syntheticRepository";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { buildStagesDetails } from "../../utils/helper/modelHelper/planningHelper";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { Response } from "express";
import {
  inboundColumns,
  mappingInboundRow,
} from "../../utils/mapping/warehouse/inboundRowAndColumn";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";

const devEnvironment = process.env.NODE_ENV !== "production";
const { inbound } = CacheKey.warehouse;
const { paper, box } = CacheKey.waitingCheck;

export const inboundService = {
  //====================================WAITING CHECK AND INBOUND QTY========================================
  getPaperWaitingChecked: async () => {
    const cacheKey = paper.all;

    try {
      const { isChanged } = await CacheManager.check(
        [{ model: PlanningPaper }, { model: InboundHistory }],
        "checkPaper",
      );

      if (isChanged) {
        await CacheManager.clear("checkPaper");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data waiting check paper from Redis");
          return {
            ...JSON.parse(cachedData),
            message: `get planning paper waiting check from cache`,
          };
        }
      }

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

      const responseData = {
        message: "get planning paper waiting check successfully",
        data: allPlannings,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("Failed to get paper waiting checked:", error);
      throw AppError.ServerError();
    }
  },

  getBoxWaitingChecked: async () => {
    const cacheKey = box.all;

    try {
      const { isChanged } = await CacheManager.check(PlanningBox, "checkBox");

      if (isChanged) {
        await CacheManager.clear("checkBox");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data waiting check box from Redis");
          return {
            ...JSON.parse(cachedData),
            message: `get planning box waiting check from cache`,
          };
        }
      }

      const planning = await warehouseRepository.getBoxWaitingChecked();

      const responseData = { message: `get planning box waiting check`, data: planning };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
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
        getAllOverflow: (id) => syntheticRepository.getAllTimeOverflow(id),
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
      const planning = await manufactureRepo.getPapersById(planningId, transaction);
      if (!planning) {
        throw AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
      }

      const totalInboundQty =
        (await InboundHistory.sum("qtyInbound", {
          where: { planningId: planning.planningId },
          transaction,
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

      const inboundRecord = await planningHelper.createData({
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

      //xóa cache
      await CacheManager.clear("checkPaper");

      //--------------------MEILISEARCH-----------------------
      await inboundService.syncInboundAndInventoryToMeili({
        inboundId: inboundRecord.inboundId,
        orderId: planning.orderId,
        transaction,
      });

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
      const planning = await planningHelper.getModelById({
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

      const inboundRecord = await planningHelper.createData({
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

      //xóa cache
      await CacheManager.clear("checkBox");

      //--------------------MEILISEARCH-----------------------
      await inboundService.syncInboundAndInventoryToMeili({
        inboundId: inboundRecord.inboundId,
        orderId: planning.orderId,
        transaction,
      });

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

  syncInboundAndInventoryToMeili: async ({
    inboundId,
    orderId,
    transaction,
  }: {
    inboundId: number;
    orderId: string;
    transaction: Transaction;
  }) => {
    try {
      const [inbound, inventory] = await Promise.all([
        warehouseRepository.syncInbound(inboundId, transaction),
        inventoryRepository.syncInventoryToMeili(orderId, transaction),
      ]);

      const flattenInbound = meiliTransformer.inbound(inbound);
      const flattenInventory = meiliTransformer.inventory(inventory);

      await meiliService.syncOrUpdateMeiliData({
        indexKey: MEILI_INDEX.INBOUND,
        data: flattenInbound,
        transaction,
      });
      await meiliService.syncOrUpdateMeiliData({
        indexKey: MEILI_INDEX.INVENTORIES,
        data: flattenInventory,
        transaction,
      });
    } catch (error) {
      console.error("Error sync inbound & inventory box:", error);
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

      const { rows, count } = await warehouseRepository.findInboundByPage({ page, pageSize });
      const totalPages = Math.ceil(count / pageSize);

      const responseData = {
        message: "Get all inbound history successfully",
        data: rows,
        totalInbounds: count,
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

  getInboundByField: async ({
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
      const validFields = ["orderId", "customerName", "dateInbound", "checkedBy"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("inboundHistories");

      let searchKeyword = keyword;
      let filter = [];

      if (field === "dateInbound") {
        searchKeyword = "";

        if (startDate && endDate) {
          const startTimestamp = dayjsUtc.utc(startDate).startOf("day").unix();
          filter.push(`dateInbound >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.utc(endDate).endOf("day").unix();
          filter.push(`dateInbound <= ${endTimestamp}`);
        }

        // console.log(`start: ${startDate} - end: ${endDate}`);
        // console.log(`filter: ${filter.join(" AND ")}`);
      }

      const searchResult = await index.search(searchKeyword, {
        filter: filter.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["inboundId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const inboundIds = searchResult.hits.map((hit: any) => hit.inboundId);

      // console.log(`result: ${inboundIds.join(", ")}`);

      if (inboundIds.length === 0) {
        return {
          message: "No inbound histories found",
          data: [],
          totalInbounds: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      //query db
      const { rows } = await warehouseRepository.findInboundByPage({
        whereCondition: { inboundId: { [Op.in]: inboundIds } },
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = inboundIds
        .map((id) => rows.find((inbound) => inbound.inboundId === id))
        .filter(Boolean);

      return {
        message: "Get inbound histories from Meilisearch & DB successfully",
        data: finalData,
        totalInbounds: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error(`get inbound history by ${field} failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelInboundHistory: async (res: Response, { fromDate, toDate }: any) => {
    try {
      let whereCondition: any = {};

      if (fromDate && toDate) {
        const startTimestamp = dayjsUtc(fromDate).startOf("day").toDate();
        const endTimestamp = dayjsUtc(toDate).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dateInbound = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const { rows } = await warehouseRepository.findInboundByPage({
        whereCondition,
      });

      await exportExcelResponse(res, {
        data: rows,
        sheetName: "Lịch Sử Nhập Kho",
        fileName: "inbound_histories",
        columns: inboundColumns,
        rows: mappingInboundRow,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      throw AppError.ServerError();
    }
  },
};
