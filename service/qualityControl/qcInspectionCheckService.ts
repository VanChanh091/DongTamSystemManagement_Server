import { Request } from "express";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CriteriaBoxCheck } from "../../models/admin/criteriaCheck/criteriaBoxCheck";
import { CriteriaPaperCheck } from "../../models/admin/criteriaCheck/criteriaPaperCheck";
import { PlanningPaper } from "../../models/planning/planningPaper";
import {
  qcCheckBox,
  QcInspectionBox,
} from "../../models/qualityControl/qcInspection/qcInspectionBox";
import {
  qcCheckPaper,
  QcInspectionPaper,
} from "../../models/qualityControl/qcInspection/qcInspectionPaper";
import { qcRepository } from "../../repository/qcRepository";
import { AppError } from "../../utils/appError";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";

const { paper } = CacheKey.qcInspection;
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
    planningId,
    username,
    machine,
  }: {
    req: Request;
    checking: Record<string, number>;
    errProgress: qcCheckPaper;
    planningId: number;
    username: string;
    machine: string;
  }) => {
    try {
      return runInTransaction(async (transaction) => {
        const dbData: any = {
          planningId: planningId,
          timeInspection: new Date(),
          checkedBy: username,
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

        dbData.checkList = errProgress;
        await QcInspectionPaper.create(dbData, { transaction });

        //lọc các tiêu chí bị lỗi
        const failedCriteria = Object.entries(errProgress)
          .filter(([_, value]) => value === false)
          .map(([key]) => key);

        const currentStatusCheck = failedCriteria.length > 0 ? "failed" : "passed";
        await PlanningPaper.update(
          { statusCheck: currentStatusCheck },
          { where: { planningId }, transaction },
        );

        const planning = await PlanningPaper.findOne({
          attributes: ["orderId"],
          where: { planningId },
          transaction,
        });

        //socket
        if (currentStatusCheck === "failed") {
          const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
          const item: any = {
            from: "QC",
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
      // const cacheKey = paper.page(machine, page);

      // const { isChanged } = await CacheManager.check(
      //   [{ model: QcInspectionPaper }],
      //   "inspectionPaper",
      // );

      // if (isChanged) {
      //   await CacheManager.clear("inspectionPaper");
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ Data Inspection Box from Redis");
      //     return {
      //       ...JSON.parse(cachedData),
      //       message: `get all Qc Inspection Box from cache successfully`,
      //     };
      //   }
      // }

      const options = qcRepository.buildInspectionBoxOptions({ page, pageSize, machine });
      const { rows, count } = await QcInspectionBox.findAndCountAll(options);

      const responseData = {
        message: "get all Qc Inspection Box successfully",
        data: rows,
        totalInspecPaper: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("get all Qc Inspection Box failed:", error);
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
    machine,
    planningBoxId,
    username,
    errProgress,
  }: {
    req: Request;
    planningBoxId: number;
    machine: string;
    username: string;
    errProgress: qcCheckBox;
  }) => {
    try {
      return runInTransaction(async (transaction) => {
        const dbData: any = {
          timeInspection: new Date(),
          checkedBy: username,
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

        //lay criteria check
        const requiredCriteria = await CriteriaBoxCheck.findAll({
          attributes: ["criteriaBoxCode"],
          where: { machine },
          transaction,
        });

        //so sánh với criteria check
        const requiredCriteriaCodes = requiredCriteria.map((c) => c.criteriaBoxCode);
        const missingCriteria = requiredCriteriaCodes.filter((code) => !(code in errProgress));

        if (missingCriteria.length > 0) {
          throw AppError.BadRequest(
            `Missing required criteria: ${missingCriteria.join(", ")}`,
            "MISSING_REQUIRED_CRITERIA",
          );
        }

        dbData.checkList = errProgress;
        await QcInspectionBox.create(dbData, { transaction });

        //lọc các tiêu chí bị lỗi
        const failedCriteria = Object.entries(errProgress)
          .filter(([_, value]) => value === false)
          .map(([key]) => key);

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
