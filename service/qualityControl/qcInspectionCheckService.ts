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
import { manufactureRepo } from "../../repository/manufactureRepository";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { Op } from "sequelize";

const { paper } = CacheKey.qcInspection;
const devEnvironment = process.env.NODE_ENV !== "production";

export const qcInspectionService = {
  //=================================MANUFACTURE=====================================
  getManuPaperToCheck: async (machine: string) => {
    try {
      const plannings = await manufactureRepo.buildQueryManuPapers({
        chooseMachine: machine,
        status: { [Op.in]: ["planning", "lackQty", "producing", "requested"] },
        statusCheck: { [Op.in]: ["none", "failed"] },
      });

      // const allPlannings: any[] = [];
      // const overflowRemoveFields = ["runningPlan", "quantityManufacture"];

      // plannings.forEach((planning) => {
      //   const original = {
      //     ...planning.toJSON(),
      //     timeRunning: planning.timeRunning,
      //     dayStart: planning.dayStart,
      //   };
      //   allPlannings.push(original);

      //   if (planning.timeOverFlow) {
      //     const overflow: any = { ...planning.toJSON() };

      //     overflow.isOverflow = true;
      //     overflow.dayStart = planning.timeOverFlow.overflowDayStart;
      //     overflow.timeRunning = planning.timeOverFlow.overflowTimeRunning;
      //     overflow.dayCompleted = planning.timeOverFlow.overflowDayCompleted;

      //     overflowRemoveFields.forEach((f) => delete overflow[f]);
      //     if (overflow.Order) {
      //       ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach(
      //         (item) => delete overflow.Order[item],
      //       );
      //     }

      //     allPlannings.push(overflow);
      //   }
      // });

      return { message: "get manufacture paper to check successfully", data: plannings };
    } catch (error) {
      console.error("get manufacture paper to check failed:", error);
      throw AppError.ServerError();
    }
  },

  getManuBoxToCheck: async (machine: string) => {
    try {
      const data = await manufactureRepo.getManufactureBox(machine, { status: "producing" });
      return { message: "get manufacture box to check successfully", data };
    } catch (error) {
      console.error("get manufacture box to check failed:", error);
      throw AppError.ServerError();
    }
  },

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

        //socket
        if (currentStatusCheck === "failed") {
          const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
          const item: any = {
            message: `Có lỗi hàng hóa khi kiểm tra tại ${machine}: ${failedCriteria.join(", ")}`,
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

  checkingInspectionBox: async ({
    req,
    machine,
    boxTimeId,
    username,
    errProgress,
  }: {
    req: Request;
    boxTimeId: number;
    machine: string;
    username: string;
    errProgress: qcCheckBox;
  }) => {
    try {
      return runInTransaction(async (transaction) => {
        const dbData: any = {
          boxTimeId: boxTimeId,
          timeInspection: new Date(),
          checkedBy: username,
        };

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
            message: `Có lỗi hàng hóa khi kiểm tra tại ${machine}: ${failedCriteria.join(", ")}`,
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
