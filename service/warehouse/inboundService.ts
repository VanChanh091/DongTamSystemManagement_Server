import dotenv from "dotenv";
dotenv.config();

import { Response } from "express";
import { Op, Transaction } from "sequelize";
import { meiliService } from "../system/meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningBox } from "../../models/planning/planningBox";
import { dayjsUtc, VN_TZ } from "../../assets/configs/dayjs/dayjs.config";
import { PlanningPaper } from "../../models/planning/planningPaper";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { manufactureRepo } from "../../repository/production/manufactureRepository";
import { warehouseRepository } from "../../repository/warehouse/warehouseRepository";
import { InventoryWipSheets } from "../../models/warehouse/inventory/inventory_wip_sheets";
import { inventoryRepository } from "../../repository/warehouse/inventoryRepository";
import { syntheticRepository } from "../../repository/synthetic/syntheticRepository";
import { exportExcelStreamResponse } from "../../utils/helper/excelExporter";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { buildStagesDetails } from "../../utils/helper/modelHelper/planning.timeRunning.helper";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import {
  inboundColumns,
  mappingInboundRow,
} from "../../utils/mapping/warehouse/inboundRowAndColumn";
import { inventoryService } from "../inventory/inventoryService";
import { inventoryLogService } from "../inventory/inventoryLogService";
import { CrudHelper } from "../../repository/helper/crud.helper.repository";

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

      //createData inventory
      const inventory = await inventoryService.createNewInventory(planning.orderId, transaction);

      //createData inbound record
      const pricePaper = planning.Order.pricePaper ?? 0;

      const inboundRecord = await CrudHelper.createData({
        model: InboundHistory,
        data: {
          dateInbound: new Date(),
          qtyPaper: qtyProduced,
          qtyInbound: inboundQty,
          totalPrice: inboundQty * pricePaper,

          orderId: planning.orderId,
          planningId,
          qcSessionId,
        },
        transaction,
      });

      //update inventory
      const finalQty = inventory.qtyInventory + inboundQty;
      const finalValue = finalQty < 0 ? 0 : finalQty * pricePaper;

      await Inventory.update(
        {
          totalQtyInbound: inventory.totalQtyInbound + inboundQty,
          qtyInventory: finalQty,
          valueInventory: finalValue,
        },
        {
          where: { orderId: planning.orderId },
          transaction,
        },
      );

      // Cập nhật trạng thái PlanningPaper và Tồn kho BTP (inventoryWipSheets)
      const currentTotalInbound = totalInboundQty + inboundQty;
      const isPaperCompleted = currentTotalInbound >= qtyProduced;

      const invWipSheet = await InventoryWipSheets.findOne({
        where: { planningId: planning.planningId, status: "in_wip" },
        transaction,
        lock: transaction?.LOCK.UPDATE,
      });

      if (isPaperCompleted) {
        await planning.update({ statusRequest: "finalize" }, { transaction });

        if (invWipSheet) {
          await invWipSheet.update(
            {
              status: "completed",
              qtyRemaining: 0,
              totalPrice: 0,
              inboundedAt: new Date(),
            },
            { transaction },
          );

          //--------------------MEILISEARCH-----------------------
          await meiliService.deleteMeiliData({
            indexKey: MEILI_INDEX.INVENTORY_WIP_SHEETS,
            idOrIds: invWipSheet.wipSheetId,
            transaction,
          });
        }
      } else {
        if (planning.statusRequest !== "inbounded") {
          await planning.update({ statusRequest: "inbounded" }, { transaction });
        }

        if (invWipSheet) {
          const newRemaining = Math.max(0, Number(invWipSheet.qtyRemaining || 0) - inboundQty);
          const unitPrice = Number(invWipSheet.unitPrice || 0);

          await invWipSheet.update(
            { qtyRemaining: newRemaining, totalPrice: newRemaining * unitPrice },
            { transaction },
          );

          //--------------------MEILISEARCH-----------------------
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.INVENTORY_WIP_SHEETS,
            data: { wipSheetId: invWipSheet.wipSheetId, qtyRemaining: newRemaining },
            isUpdate: true,
            transaction,
          });
        }
      }

      if (isFirstInbound) {
        await Inventory.update(
          { dateInbound: new Date() },
          { where: { orderId: planning.orderId }, transaction },
        );
      }

      //inventory log
      await inventoryLogService.followInventoryChange({
        items: [{ inventoryId: inventory.inventoryId, changeQty: inboundQty }],
        type: "INBOUND",
        transaction,
      });

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
    isFinal,
    transaction,
  }: {
    planningBoxId: number;
    inboundQty: number;
    qcSessionId: number;
    isFinal?: boolean;
    transaction?: any;
  }) => {
    try {
      const planning = await CrudHelper.findOne({
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

      //createData inventory
      const inventory = await inventoryService.createNewInventory(planning.orderId, transaction);

      //createData inbound record
      const pricePaper = planning.Order.pricePaper ?? 0;

      const inboundRecord = await CrudHelper.createData({
        model: InboundHistory,
        data: {
          dateInbound: new Date(),
          qtyPaper: planning.qtyPaper,
          qtyInbound: inboundQty,
          totalPrice: inboundQty * pricePaper,

          orderId: planning.orderId,
          planningBoxId,
          qcSessionId,
        },
        transaction,
      });

      //update inventory
      const finalQty = inventory.qtyInventory + inboundQty;
      const finalValue = finalQty < 0 ? 0 : finalQty * pricePaper;

      await Inventory.update(
        {
          totalQtyInbound: inventory.totalQtyInbound + inboundQty,
          qtyInventory: finalQty,
          valueInventory: finalValue,
        },
        {
          where: { orderId: planning.orderId },
          transaction,
        },
      );

      // Cập nhật trạng thái PlanningBox và Tồn kho BTP (inventoryWipSheets)
      const currentTotalInbound = totalInboundQty + inboundQty;
      const quantityCustomer = Number(planning.Order?.quantityCustomer || 0);
      const isBoxCompleted = currentTotalInbound >= quantityCustomer || isFinal === true;

      if (isBoxCompleted) {
        // Case 2: Đã nhập đủ hoặc vượt số lượng Order -> Chốt finalize
        await planning.update({ statusRequest: "finalize" }, { transaction });

        // Lấy danh sách wipSheetId trước khi chuyển completed để đồng bộ xóa Meilisearch
        const wipSheets = await InventoryWipSheets.findAll({
          where: { orderId: planning.orderId, status: "in_wip" },
          attributes: ["wipSheetId"],
          transaction,
        });
        const wipSheetIds = wipSheets.map((item) => item.wipSheetId);

        // Chuyển toàn bộ BTP của đơn hàng về completed
        await InventoryWipSheets.update(
          {
            status: "completed",
            qtyRemaining: 0,
            totalPrice: 0,
            inboundedAt: new Date(),
          },
          { where: { wipSheetId: wipSheetIds }, transaction },
        );

        // --------------------MEILISEARCH-----------------------
        if (wipSheetIds.length > 0) {
          await meiliService.deleteMeiliData({
            indexKey: MEILI_INDEX.INVENTORY_WIP_SHEETS,
            idOrIds: wipSheetIds,
            transaction,
          });
        }
      } else {
        // Case 1: Thùng ít hơn Order -> Đặt inbounded để có thể tiếp tục nhập thêm
        if (planning.statusRequest !== "inbounded") {
          await planning.update({ statusRequest: "inbounded" }, { transaction });
        }
      }

      if (isFirstInbound) {
        await Inventory.update(
          { dateInbound: new Date() },
          { where: { orderId: planning.orderId }, transaction },
        );
      }

      await inventoryLogService.followInventoryChange({
        items: [{ inventoryId: inventory.inventoryId, changeQty: inboundQty }],
        type: "INBOUND",
        transaction,
      });

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
        warehouseRepository.syncInboundForMeili(inboundId, transaction),
        inventoryRepository.syncInventoryForMeili(orderId, transaction),
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

      const options = warehouseRepository.buildInboundOptions({ page, pageSize });
      const { rows, count } = await InboundHistory.findAndCountAll(options);

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
          const startTimestamp = dayjsUtc.tz(startDate, VN_TZ).startOf("day").unix();
          filter.push(`dateInbound >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.tz(endDate, VN_TZ).endOf("day").unix();
          filter.push(`dateInbound <= ${endTimestamp}`);
        }

        // console.log(`start: ${startDate} - end: ${endDate}`);
        // console.log(`filter: ${filter.join(" AND ")}`);
      }

      const searchOptions: any = {
        filter: filter.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["inboundId"],
        sort: ["dateInbound:desc"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      };

      const searchResult = await index.search(searchKeyword, searchOptions);

      const inboundIds = searchResult.hits.map((hit: any) => hit.inboundId);
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
      const options = warehouseRepository.buildInboundOptions({
        whereCondition: { inboundId: { [Op.in]: inboundIds } },
      });
      const { rows } = await InboundHistory.findAndCountAll(options);

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

  exportExcelInboundHistory: async (res: Response, { fromDate, toDate }: any, userName: string) => {
    try {
      let whereCondition: any = {};

      if (fromDate && toDate) {
        const startTimestamp = dayjsUtc.tz(fromDate, VN_TZ).startOf("day").toDate();
        const endTimestamp = dayjsUtc.tz(toDate, VN_TZ).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dateInbound = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const baseQuery: any = warehouseRepository.buildInboundOptions({
        whereCondition,
        isExport: true,
      });

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: InboundHistory,
        sheetName: "Lịch sử nhập kho",
        fileName: "inbound_history",
        columns: inboundColumns,
        rows: mappingInboundRow,
        userName: userName,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      throw AppError.ServerError();
    }
  },
};
