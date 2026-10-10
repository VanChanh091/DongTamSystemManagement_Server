import { Request } from "express";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CriteriaBoxCheck } from "../../models/admin/criteriaCheck/criteriaBoxCheck";
import { CriteriaPaperCheck } from "../../models/admin/criteriaCheck/criteriaPaperCheck";
import { PlanningPaper } from "../../models/planning/planningPaper";
import {
  qcCheckBox,
  QcInspectionBox,
} from "../../models/qualityControl/inspection/qcInspectionBox";
import {
  qcCheckPaper,
  QcInspectionPaper,
} from "../../models/qualityControl/inspection/qcInspectionPaper";
import { qcRepository } from "../../repository/qcRepository";
import { AppError } from "../../utils/appError";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import { Op } from "sequelize";
import { searchFieldAtribute } from "../../interface/types";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";

const { paper, box } = CacheKey.qcInspection;
const devEnvironment = process.env.NODE_ENV !== "production";

export const qcInspectionService = {
  //===============================INSPECTION PAPER===================================
  getAllQcInspectionPaper: async ({
    page,
    pageSize,
    machine,
  }: {
    page: number;
    pageSize: number;
    machine: string;
  }) => {
    try {
      const cacheKey = paper.page(machine, page);

      const { isChanged } = await CacheManager.check(
        [{ model: QcInspectionPaper }],
        "inspectionPaper",
      );

      if (isChanged) {
        await CacheManager.clear("inspectionPaper");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Inspection Paper from Redis");
          return {
            ...JSON.parse(cachedData),
            message: `get all Qc Inspection Paper from cache successfully`,
          };
        }
      }

      const options = qcRepository.buildInspectionPaperOptions({ page, pageSize, machine });
      const { rows, count } = await QcInspectionPaper.findAndCountAll(options);

      const responseData = {
        message: "get all Qc Inspection Paper successfully",
        data: rows,
        totalInspecPaper: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("get all Qc Inspection Paper failed:", error);
      throw AppError.ServerError();
    }
  },

  getInspectionPaperByField: async ({
    page,
    pageSize,
    machine,
    field,
    keyword,
  }: searchFieldAtribute) => {
    try {
      const validFields = ["orderId", "customerName", "checkedBy"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("inspection_papers");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["inspecPaperId"],
        sort: ["inspecPaperId:desc"],
        filter: `machine = "${machine}"`,
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const inspecPaperIds = searchResult.hits.map((hit: any) => hit.inspecPaperId);
      if (inspecPaperIds.length === 0) {
        return {
          message: "No inspection papers found",
          data: [],
          totalInventory: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      //query db
      const options = qcRepository.buildInspectionPaperOptions({
        whereCondition: { inspecPaperId: { [Op.in]: inspecPaperIds } },
        machine: machine!,
      });
      const { rows } = await QcInspectionPaper.findAndCountAll(options);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = inspecPaperIds
        .map((id) => rows.find((inspec) => inspec.inspecPaperId === id))
        .filter(Boolean);

      return {
        message: "Get InspectionPaper from Meilisearch & DB successfully",
        data: finalData,
        totalInventory: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error("Failed to get Qc Inspection Paper by field:", error);
      throw AppError.ServerError();
    }
  },

  getInspectionPaperErr: async (planningId: number) => {
    try {
      const inspectionPaper = await QcInspectionPaper.findOne({
        attributes: { exclude: ["createdAt", "updatedAt", "timeInspection", "checkedBy"] },
        where: { planningId },
        order: [["inspecPaperId", "DESC"]],
      });
      return { message: "get inspection paper errors successfully", data: inspectionPaper };
    } catch (error) {
      console.error("get inspection paper errors failed:", error);
      throw AppError.ServerError();
    }
  },

  checkingInspectionPaper: async ({
    req,
    checking,
    errProgress,
    otherData,
  }: {
    req: Request;
    checking: Record<string, number>;
    errProgress: qcCheckPaper;
    otherData: {
      planningId: number;
      machine: string;
      note?: string;
      imgErr?: string;
    };
  }) => {
    const { planningId, machine, note, imgErr } = otherData;

    try {
      return runInTransaction(async (transaction) => {
        const dbData: any = {
          planningId: planningId,
          timeInspection: new Date(),
          checkedBy: req.user.fullName,
          userId: req.user.userId,
          note: note || null,
        };

        if (checking) {
          for (const [key, value] of Object.entries(checking)) dbData[key] = value;
        }

        //lay criteria check
        const requiredCriteria = await CriteriaPaperCheck.findAll({
          attributes: ["criteriaPaperCode"],
          transaction,
        });

        //so sánh với criteria check
        const requiredCriteriaCodes = requiredCriteria.map((c) => c.criteriaPaperCode);
        const missingCriteria = requiredCriteriaCodes.filter((code) => !(code in errProgress));

        if (missingCriteria.length > 0) {
          throw AppError.BadRequest(
            `Missing required criteria: ${missingCriteria.join(", ")}`,
            "MISSING_REQUIRED_CRITERIA",
          );
        }

        // Lọc tiêu chí lỗi & tính toán result
        const failedCriteria = Object.entries(errProgress)
          .filter(([_, value]) => value === false)
          .map(([key]) => key);

        // false nếu có ít nhất 1 tiêu chí false
        const isPassed = failedCriteria.length === 0;

        dbData.checkList = errProgress;
        dbData.result = isPassed;
        if (imgErr) dbData.imgError = imgErr;

        await QcInspectionPaper.create(dbData, { transaction });

        // Cập nhật trạng thái PlanningPaper dựa trên kết quả
        const currentStatusCheck = failedCriteria.length > 0 ? "failed" : "passed";
        await PlanningPaper.update(
          { statusCheck: currentStatusCheck },
          { where: { planningId }, transaction },
        );

        //socket
        const planning = await PlanningPaper.findOne({
          attributes: ["orderId"],
          where: { planningId },
          transaction,
        });

        if (currentStatusCheck === "failed") {
          const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
          const item: any = {
            from: "QC",
            planningId: planningId,
            message: `Đơn hàng: ${planning?.orderId} đang bị lỗi tại ${machine}`,
          };

          req.io?.to(roomName).emit("qc-inspection-paper", item);
        }

        return { message: "Create Qc Inspection Paper successfully" };
      });
    } catch (error) {
      console.error("Error checking inspection paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //paper or box
  getReportQcInspectionSummary: async ({
    machine,
    startDate,
    endDate,
    isPaper,
    user,
  }: {
    machine: string;
    startDate: string;
    endDate: string;
    isPaper: string;
    user: any;
  }) => {
    const { userId, role } = user;

    try {
      let whereConditions: any = [];

      // console.log(`start: ${startDate} - endDate: ${endDate}`);

      if (startDate && endDate) {
        const startTimestamp = dayjsUtc.utc(startDate).startOf("day").format("YYYY-MM-DD HH:mm:ss");
        const endTimestamp = dayjsUtc.utc(endDate).endOf("day").format("YYYY-MM-DD HH:mm:ss");

        // console.log(`formatStart: ${startTimestamp} - formatEnd: ${endTimestamp}`);

        whereConditions.push({
          timeInspection: {
            [Op.between]: [startTimestamp, endTimestamp],
          },
        });
      }

      const isAdminOrManager = role && ["admin", "manager"].includes(role.toLowerCase());
      if (userId && !isAdminOrManager) {
        whereConditions.push({ userId });
      }

      const isPaperType = isPaper === "paper";
      const summaryMap: Record<string, { name: string; count: number }> = {};

      const criteriaList: { code: string; name: string }[] = isPaperType
        ? (
            await CriteriaPaperCheck.findAll({
              attributes: [
                ["criteriaPaperCode", "code"],
                ["criteriaPaperName", "name"],
              ],
              raw: true,
            })
          ).map((item: any) => ({ code: item.code, name: item.name }))
        : (
            await CriteriaBoxCheck.findAll({
              where: { machine },
              attributes: [
                ["criteriaBoxCode", "code"],
                ["criteriaBoxName", "name"],
              ],
              raw: true,
            })
          ).map((item: any) => ({ code: item.code, name: item.name }));

      // Khởi tạo danh sách với count = 0
      for (const item of criteriaList) {
        summaryMap[item.code] = { name: item.name, count: 0 };
      }

      // Danh sách kiểm tra từ DB
      const listInspection = isPaperType
        ? await qcRepository.getChecklistInspectionPaper({ whereConditions, machine })
        : await qcRepository.getChecklistInspectionBox({ whereConditions, machine });

      for (const item of listInspection) {
        const checkList = item.checkList as Record<string, boolean>;
        if (!checkList || typeof checkList !== "object") continue;

        for (const [key, value] of Object.entries(checkList)) {
          if (!value) {
            summaryMap[key]
              ? (summaryMap[key].count += 1)
              : (summaryMap[key] = { name: key, count: 1 });
          }
        }
      }

      const summaryData = Object.entries(summaryMap).map(([key, item]) => ({
        key,
        name: item.name,
        count: item.count,
      }));

      return { message: "Summarized inspection errors successfully", data: summaryData };
    } catch (error) {
      console.error("Error summing errors in inspection:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================INSPECTION BOX===================================
  getAllQcInspectionBox: async ({
    page,
    pageSize,
    machine,
  }: {
    page: number;
    pageSize: number;
    machine: string;
  }) => {
    try {
      const cacheKey = box.page(machine, page);

      const { isChanged } = await CacheManager.check([{ model: QcInspectionBox }], "inspectionBox");

      if (isChanged) {
        await CacheManager.clear("inspectionBox");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Inspection Box from Redis");
          return {
            ...JSON.parse(cachedData),
            message: `get all Qc Inspection Box from cache`,
          };
        }
      }

      const options = qcRepository.buildInspectionBoxOptions({ page, pageSize, machine });
      const { rows, count } = await QcInspectionBox.findAndCountAll(options);

      const responseData = {
        message: "get all Qc Inspection Box successfully",
        data: rows,
        totalInspecPaper: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("get all Qc Inspection Box failed:", error);
      throw AppError.ServerError();
    }
  },

  getInspectionBoxByField: async ({
    page,
    pageSize,
    machine,
    field,
    keyword,
  }: searchFieldAtribute) => {
    try {
      const validFields = ["orderId", "customerName", "checkedBy"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("inspection_boxes");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["inspecBoxId"],
        sort: ["inspecBoxId:desc"],
        filter: `machine = "${machine}"`,
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const inspecBoxIds = searchResult.hits.map((hit: any) => hit.inspecBoxId);
      if (inspecBoxIds.length === 0) {
        return {
          message: "No inspection boxes found",
          data: [],
          totalInventory: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      //query db
      const options = qcRepository.buildInspectionBoxOptions({
        whereCondition: { inspecBoxId: { [Op.in]: inspecBoxIds } },
        machine: machine!,
      });
      const { rows } = await QcInspectionBox.findAndCountAll(options);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = inspecBoxIds
        .map((id) => rows.find((inspec) => inspec.inspecBoxId === id))
        .filter(Boolean);

      return {
        message: "Get InspectionBox from Meilisearch & DB successfully",
        data: finalData,
        totalInventory: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error("Failed to get Qc Inspection Box by field:", error);
      throw AppError.ServerError();
    }
  },

  getInspectionBoxErr: async (planningBoxId: number, machine: string) => {
    try {
      const boxTime = await PlanningBoxTime.findOne({
        attributes: ["boxTimeId"],
        where: { planningBoxId, machine },
      });
      if (!boxTime) {
        throw AppError.NotFound(
          `Planning Box with ID ${planningBoxId} not found`,
          "PLANNING_BOX_NOT_FOUND",
        );
      }

      const inspectionBox = await QcInspectionBox.findOne({
        attributes: { exclude: ["createdAt", "updatedAt", "timeInspection", "checkedBy"] },
        where: { boxTimeId: boxTime.boxTimeId },
        order: [["inspecBoxId", "DESC"]],
      });
      return { message: "get inspection box errors successfully", data: inspectionBox };
    } catch (error) {
      console.error("get inspection box errors failed:", error);
      throw AppError.ServerError();
    }
  },

  checkingInspectionBox: async ({
    req,
    errProgress,
    otherData,
  }: {
    req: Request;
    errProgress: qcCheckBox;
    otherData: {
      planningBoxId: number;
      machine: string;
      note?: string;
      imgErr?: string;
    };
  }) => {
    const { planningBoxId, machine, note, imgErr } = otherData;

    try {
      return runInTransaction(async (transaction) => {
        const dbData: any = {
          timeInspection: new Date(),
          checkedBy: req.user.fullName,
          userId: req.user.userId,
          note: note || null,
        };

        const boxTime = await PlanningBoxTime.findOne({
          attributes: ["boxTimeId"],
          where: { planningBoxId, machine },
          transaction,
        });
        if (!boxTime) {
          throw AppError.NotFound(
            `Planning Box with ID ${planningBoxId} not found`,
            "PLANNING_BOX_NOT_FOUND",
          );
        }

        const boxTimeId = boxTime.boxTimeId;
        dbData.boxTimeId = boxTimeId;

        //get criteria check
        const requiredCriteria = await CriteriaBoxCheck.findAll({
          attributes: ["criteriaBoxCode"],
          where: { machine },
          transaction,
        });

        //compare with criteria check
        const requiredCriteriaCodes = requiredCriteria.map((c) => c.criteriaBoxCode);
        const missingCriteria = requiredCriteriaCodes.filter((code) => !(code in errProgress));

        if (missingCriteria.length > 0) {
          throw AppError.BadRequest(
            `Missing required criteria: ${missingCriteria.join(", ")}`,
            "MISSING_REQUIRED_CRITERIA",
          );
        }

        // Lọc tiêu chí lỗi & tính toán result
        const failedCriteria = Object.entries(errProgress)
          .filter(([_, value]) => value === false)
          .map(([key]) => key);

        // false nếu có ít nhất 1 cái false
        const isPassed = failedCriteria.length === 0;

        dbData.checkList = errProgress;
        dbData.result = isPassed;
        if (imgErr) dbData.imgError = imgErr;

        await QcInspectionBox.create(dbData, { transaction });

        // Cập nhật trạng thái PlanningBoxTime
        const currentStatusCheck = failedCriteria.length > 0 ? "failed" : "passed";
        await PlanningBoxTime.update(
          { statusCheck: currentStatusCheck },
          { where: { boxTimeId }, transaction },
        );

        //socket
        if (currentStatusCheck === "failed") {
          const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
          const item: any = {
            from: "QC",
            planningBoxId: planningBoxId,
            machine: machine,
            message: `Có đơn hàng sản xuất đang bị lỗi tại ${machine}`,
          };

          req.io?.to(roomName).emit("qc-inspection-box", item);
        }

        return { message: "Create Qc Inspection Box successfully" };
      });
    } catch (error) {
      console.error("Error checking inspection box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
