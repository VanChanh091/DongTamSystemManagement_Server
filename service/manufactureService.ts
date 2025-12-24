import dotenv from "dotenv";
dotenv.config();

import redisCache from "../configs/redisCache";
import { Op } from "sequelize";
import { CacheManager } from "../utils/helper/cacheManager";
import { AppError } from "../utils/appError";
import { PlanningPaper } from "../models/planning/planningPaper";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { manufactureRepository } from "../repository/manufactureRepository";
import { machineLabels } from "../configs/machineLabels";
import { planningRepository } from "../repository/planningRepository";
import { PlanningBox } from "../models/planning/planningBox";
import { Order } from "../models/order/order";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { createReportPlanning } from "../utils/helper/modelHelper/reportHelper";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { mergeShiftField } from "../utils/helper/modelHelper/planningHelper";
import { runInTransaction } from "../utils/helper/transactionHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = CacheManager.keys.manufacture;
const { box } = CacheManager.keys.manufacture;

export const manufactureService = {
  //====================================PAPER========================================
  getPlanningPaper: async (machine: string) => {
    try {
      const cacheKey = paper.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningPaper },
          { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
        ],
        "manufacturePaper"
      );

      if (isChanged) {
        await CacheManager.clearManufacturePaper();
        await CacheManager.clearOrderAccept();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data manufacture paper from Redis");
          return {
            message: `get filtered cache planning:machine:${machine}`,
            data: JSON.parse(cachedData),
          };
        }
      }

      const planning = await manufactureRepository.getManufacturePaper(machine);

      // Lọc đơn complete chỉ giữ lại trong 1 ngày
      const truncateToDate = (date: Date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const now = truncateToDate(new Date());

      const validData = planning.filter((item) => {
        if (["planning", "lackQty", "producing"].includes(item.status)) return true;

        if (item.status === "complete") {
          const dayCompleted = item.dayCompleted ? new Date(item.dayCompleted) : null;
          if (!dayCompleted || isNaN(dayCompleted.getTime())) return false;

          const expiredDate = truncateToDate(new Date(dayCompleted));
          expiredDate.setDate(expiredDate.getDate() + 1);

          return expiredDate >= now;
        }
        return false;
      });

      const allPlannings: any[] = [];
      const overflowRemoveFields = ["runningPlan", "quantityManufacture"];

      validData.forEach((planning) => {
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

      await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);

      return {
        message: `get planning paper by machine: ${machine}`,
        data: allPlannings,
      };
    } catch (error) {
      console.error("Failed to get planning paper", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  addReportPaper: async (planningId: number, data: any, user: any) => {
    const { role, permissions: userPermissions } = user;
    const { qtyProduced, qtyWasteNorm, dayCompleted, ...otherData } = data;

    try {
      return await runInTransaction(async (transaction) => {
        if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
          throw AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
        }

        // 1. Tìm kế hoạch hiện tại
        const planning = await manufactureRepository.getPapersById(planningId, transaction);
        if (!planning) {
          throw AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
        }

        const machine = planning.chooseMachine;
        const machineLabel = machineLabels[machine];
        if (!machineLabel) {
          throw AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
        }

        //check permission for machine
        if (role !== "admin" && role !== "manager") {
          if (!userPermissions.includes(machineLabel)) {
            throw AppError.Unauthorized(
              `Access denied: You don't have permission to report for machine ${machine}`,
              "ACCESS_DENIED"
            );
          }
        }

        // 2. Cộng dồn số lượng mới vào số đã có
        const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
        const newQtyWasteNorm = Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);

        // update status dựa trên qtyProduced
        const isCompleted = newQtyProduced >= planning.runningPlan;

        const isOverflowReport =
          planning.hasOverFlow &&
          planning.timeOverFlow &&
          new Date(dayCompleted) >= new Date(planning.timeOverFlow?.overflowDayStart ?? "");

        let overflow, dayReportValue;

        //get timeOverflowPlanning
        if (planning.hasOverFlow) {
          overflow = await planningRepository.getModelById({
            model: timeOverflowPlanning,
            where: { planningId },
            options: { transaction, lock: transaction?.LOCK.UPDATE },
          });

          if (!overflow) {
            throw AppError.NotFound("Overflow plan not found", "OVERFLOW_PLAN_NOT_FOUND");
          }
        }

        dayReportValue = new Date(dayCompleted);
        if (isOverflowReport) {
          await overflow?.update({ overflowDayCompleted: dayReportValue }, { transaction });
        }

        // Merge shift fields
        let updatedShiftProduction = mergeShiftField(
          planning.shiftProduction || "",
          otherData.shiftProduction
        );

        let updatedShiftManagement = mergeShiftField(
          planning.shiftManagement || "",
          otherData.shiftManagement
        );

        await planningRepository.updateDataModel({
          model: planning,
          data: {
            qtyProduced: newQtyProduced,
            qtyWasteNorm: newQtyWasteNorm,
            status: isCompleted ? planning.status : "lackQty",
            dayCompleted: isOverflowReport ? planning.dayCompleted : dayReportValue,
            shiftProduction: updatedShiftProduction,
            shiftManagement: updatedShiftManagement,
          },
          options: { transaction },
        });

        //update qty for planning box
        if (planning.hasBox) {
          const planningBox = await planningRepository.getModelById({
            model: PlanningBox,
            where: { orderId: planning.orderId },
            options: { transaction, lock: transaction?.LOCK.UPDATE },
          });
          if (!planningBox) {
            throw AppError.NotFound("PlanningBox not found", "PLANNING_BOX_NOT_FOUND");
          }

          await planningBox.update({ qtyPaper: newQtyProduced }, { transaction });
        }

        //check qty to change status order
        const allPlans = await manufactureRepository.getPapersByOrderId(
          planning.orderId,
          transaction
        );

        const totalQtyProduced = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
        const quantityCustomer = planning.Order?.quantityCustomer || 0;

        if (totalQtyProduced >= quantityCustomer) {
          await planningRepository.updateDataModel({
            model: Order,
            data: { status: "planning" },
            options: { where: { orderId: planning.orderId }, transaction },
          });
        }

        //3. tạo report theo số lần báo cáo
        await createReportPlanning({
          planning: planning.toJSON(),
          model: ReportPlanningPaper,
          qtyProduced,
          qtyWasteNorm,
          dayReportValue,
          otherData,
          transaction,
        });

        //chuyển sang trang chờ kiểm
        await planning.update({ statusRequest: "requested" }, { transaction });

        return {
          message: "Add Report Production successfully",
          data: {
            planningId,
            qtyProduced: newQtyProduced,
            qtyWasteNorm: newQtyWasteNorm,
            dayCompleted,
            ...otherData,
          },
        };
      });
    } catch (error) {
      console.error("Error add Report Production:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmProducingPaper: async (planningId: number, user: any) => {
    const { role, permissions: userPermissions } = user;

    try {
      return await runInTransaction(async (transaction) => {
        const planning = await PlanningPaper.findOne({
          where: { planningId },
          transaction,
          lock: transaction?.LOCK.UPDATE, // lock để tránh race condition
        });

        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        // check permission
        const machine = planning.chooseMachine;
        const machineLabel = machineLabels[machine];
        if (!machineLabel) {
          throw AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
        }

        if (role !== "admin" && role !== "manager") {
          if (!userPermissions.includes(machineLabel)) {
            throw AppError.Forbidden(
              `Access denied: You don't have permission to report for machine ${machine}`,
              "ACCESS_DENIED"
            );
          }
        }

        // Check if the planning is already completed
        if (planning.status === "complete") {
          throw AppError.Conflict("Planning already completed", "PLANNING_COMPLETED");
        }

        // Check if there's another planning in 'producing' status for the same machine
        const existingProducing = await planningRepository.getModelById({
          model: PlanningPaper,
          where: { chooseMachine: machine, status: "producing" },
          options: { transaction, lock: transaction?.LOCK.UPDATE },
        });

        if (existingProducing && existingProducing.planningId !== planningId) {
          await planningRepository.updateDataModel({
            model: existingProducing,
            data: { status: "planning" },
            options: { transaction },
          });
        }

        await planningRepository.updateDataModel({
          model: planning,
          data: { status: "producing" },
          options: { transaction },
        });

        return { message: "Confirm producing paper successfully", data: planning };
      });
    } catch (error) {
      console.error("Error confirming producing paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //====================================BOX========================================
  getPlanningBox: async (machine: string) => {
    try {
      const cacheKey = box.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningBox },
          { model: PlanningBoxTime },
          { model: timeOverflowPlanning, where: { planningBoxId: { [Op.ne]: null } } },
        ],
        "manufactureBox"
      );

      if (isChanged) {
        await CacheManager.clearManufactureBox();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data manufacture box from Redis");
          return {
            message: `get filtered cached planning:box:machine:${machine}`,
            data: JSON.parse(cachedData),
          };
        }
      }

      const planning = await manufactureRepository.getManufactureBox(machine);

      //lọc đơn complete trong 1 ngày
      const truncateToDate = (date: Date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const now = truncateToDate(new Date());

      const validData = planning.filter((planning) => {
        const boxTimes = planning.boxTimes || [];

        const hasValidStatus = boxTimes.some((bt) =>
          ["planning", "lackOfQty", "producing"].includes(bt.status)
        );

        const hasRecentComplete = boxTimes.some((bt) => {
          if (bt.status !== "complete" || !bt.dayCompleted) return false;

          const dayCompleted = bt.dayCompleted ? new Date(bt.dayCompleted) : null;
          if (!dayCompleted || isNaN(dayCompleted.getTime())) return false;

          const expiredDate = truncateToDate(dayCompleted);
          expiredDate.setDate(expiredDate.getDate() + 1);

          return expiredDate >= now;
        });

        return hasValidStatus || hasRecentComplete;
      });

      const allPlannings: any[] = [];

      validData.forEach((planning) => {
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

      await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);

      return { message: `get planning by machine: ${machine}`, data: allPlannings };
    } catch (error) {
      console.error("Failed to get planning box", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  addReportBox: async (planningBoxId: number, machine: string, data: any) => {
    const { qtyProduced, rpWasteLoss, dayCompleted, shiftManagement } = data;

    try {
      return await runInTransaction(async (transaction) => {
        if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !shiftManagement) {
          throw AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
        }

        // 1. Tìm kế hoạch hiện tại
        const planning = await manufactureRepository.getBoxById(
          planningBoxId,
          machine,
          transaction
        );
        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        // 2. Cộng dồn số lượng mới vào số đã có
        const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
        const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);

        const mergedShift = mergeShiftField(planning.shiftManagement ?? "", shiftManagement);

        const isCompletedOrder = newQtyProduced >= (planning.runningPlan || 0);

        const overflow = await planningRepository.getModelById({
          model: timeOverflowPlanning,
          where: { planningBoxId, machine },
          options: { transaction, lock: transaction?.LOCK.UPDATE },
        });

        //condition
        const isOverflowReport =
          !!overflow &&
          overflow.overflowDayStart &&
          new Date(dayCompleted) >= new Date(overflow.overflowDayStart);

        let dayReportValue;

        if (isOverflowReport) {
          await overflow?.update({ overflowDayCompleted: new Date(dayCompleted) }, { transaction });

          await planningRepository.updateDataModel({
            model: planning,
            data: {
              qtyProduced: newQtyProduced,
              rpWasteLoss: newQtyWasteNorm,
              shiftManagement: mergedShift,
            },
            options: { transaction },
          });

          dayReportValue = overflow?.getDataValue("overflowDayCompleted");
        } else {
          //Cập nhật kế hoạch với số liệu mới
          await planningRepository.updateDataModel({
            model: planning,
            data: {
              dayCompleted: new Date(dayCompleted),
              qtyProduced: newQtyProduced,
              rpWasteLoss: newQtyWasteNorm,
              shiftManagement: mergedShift,
            },
            options: { transaction },
          });

          dayReportValue = planning.getDataValue("dayCompleted");
        }

        if (!isCompletedOrder) {
          await planningRepository.updateDataModel({
            model: planning,
            data: { status: "lackOfQty" },
            options: { transaction },
          });
        }

        // 3. tạo report theo số lần báo cáo
        await createReportPlanning({
          planning: planning.toJSON(),
          model: ReportPlanningBox,
          qtyProduced: qtyProduced,
          qtyWasteNorm: rpWasteLoss,
          dayReportValue: new Date(dayReportValue ?? ""),
          shiftManagementBox: shiftManagement,
          machine: planning.machine,
          transaction,
          isBox: true,
        });

        return {
          message: "Add Report Production successfully",
          data: {
            planningBoxId,
            machine,
            qtyProduced: newQtyProduced,
            qtyWasteNorm: newQtyWasteNorm,
            dayCompleted,
            shiftManagement,
            status: isCompletedOrder ? planning.status : "lackQty",
          },
        };
      });
    } catch (error) {
      console.error("Error add Report Production:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmProducingBox: async (planningBoxId: number, machine: string, user: any) => {
    const { role, permissions: userPermissions } = user;

    try {
      return await runInTransaction(async (transaction) => {
        // Lấy planning cần update
        const planning = await planningRepository.getModelById({
          model: PlanningBoxTime,
          where: { planningBoxId, machine },
          options: { transaction, lock: transaction?.LOCK.UPDATE, skipLocked: true },
        });

        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        // check permission
        // const machineLabel = machineLabels[machine as keyof typeof machineLabels] ?? null;
        // if (!machineLabel) {
        //   throw AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
        // }

        // if (role !== "admin" && role !== "manager") {
        //   if (!userPermissions.includes(machineLabel)) {
        //     throw AppError.Forbidden(
        //       `Access denied: You don't have permission to report for machine ${machine}`,
        //       "ACCESS_DENIED"
        //     );
        //   }
        // }

        // Check if already complete
        if (planning.status === "complete") {
          throw AppError.Unauthorized("Planning already completed", "PLANNING_HAS_COMPLETED");
        }

        // Reset những thằng đang "producing"
        await manufactureRepository.updatePlanningBoxTime(planningBoxId, machine, transaction);

        // Update sang producing
        await planningRepository.updateDataModel({
          model: planning,
          data: { status: "producing" },
          options: { transaction },
        });

        return { message: "Confirm producing box successfully", data: planning };
      });
    } catch (error) {
      console.error("Error confirming producing box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateRequestStockCheck: async (planningBoxId: number, machine: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        // Lấy planning cần update
        const planningBox = await PlanningBox.findByPk(planningBoxId, {
          include: [
            {
              model: PlanningBoxTime,
              where: { machine, dayStart: { [Op.ne]: null } },
              as: "boxTimes",
              attributes: ["boxTimeId", "qtyProduced", "machine", "isRequest"],
            },
          ],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!planningBox) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        if (planningBox.statusRequest == "requested") {
          throw AppError.BadRequest("Đơn này đã yêu cầu kiểm tra rồi", "ALREADY_REQUESTED");
        }

        const steps = await manufactureRepository.getAllBoxTimeById(planningBoxId, transaction);

        //check qty produced
        const checkQtyProduced = steps.some(
          (step) => step.qtyProduced == null || step.qtyProduced <= 0
        );

        console.log(checkQtyProduced);

        if (checkQtyProduced) {
          throw AppError.BadRequest(
            "Có công đoạn chưa có số lượng. Không thể yêu cầu nhập kho.",
            "STEP_QUANTITY_EQUAL_ZERO"
          );
        }

        await planningBox.update({ statusRequest: "requested" }, { transaction });
        await planningBox.boxTimes?.[0].update({ isRequest: true }, { transaction });

        return { message: "Yêu cầu nhập kho đã được gửi" };
      });
    } catch (error) {
      console.error("Error confirming producing box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
