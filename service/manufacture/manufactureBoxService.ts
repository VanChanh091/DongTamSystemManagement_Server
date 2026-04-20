import dotenv from "dotenv";
dotenv.config();

import { Request } from "express";
import { Op, Transaction } from "sequelize";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { MEILI_INDEX } from "../../assets/labelFields";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningBox } from "../../models/planning/planningBox";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { reportRepository } from "../../repository/reportRepository";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { planningPaperService } from "../planning/planningPaperService";
import { manufactureRepo } from "../../repository/manufactureRepository";
import { planningHelper } from "../../repository/planning/planningHelper";
import { ReportPlanningBox } from "../../models/report/reportPlanningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { mergeShiftField } from "../../utils/helper/modelHelper/planningHelper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { createReportPlanning } from "../../utils/helper/modelHelper/reportHelper";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { planningBoxRepository } from "../../repository/planning/planningBoxRepository";
import { aggregateReportFields } from "../../utils/helper/modelHelper/manufactureHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { box } = CacheKey.manufacture;

export const manuBoxService = {
  getPlanningBox: async (machine: string) => {
    try {
      const cacheKey = box.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningBox },
          { model: PlanningBoxTime },
          { model: timeOverflowPlanning, where: { planningBoxId: { [Op.ne]: null } } },
        ],
        "manufactureBox",
      );

      if (isChanged) {
        await CacheManager.clear("manufactureBox");
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

      const planning = await manufactureRepo.getManufactureBox(machine);

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

      await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);

      return { message: `get planning by machine: ${machine}`, data: allPlannings };
    } catch (error) {
      console.error("Failed to get planning box", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  addReportBox: async (planningBoxId: number, machine: string, data: any) => {
    const { qtyProduced, rpWasteLoss, dayCompleted, shiftManagement, reportedBy } = data;

    try {
      return await runInTransaction(async (transaction) => {
        if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !reportedBy) {
          throw AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
        }

        const employee = await manufactureRepo.getEmployeeByCode(reportedBy, transaction);
        if (!employee) {
          throw AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
        }

        // 1. Tìm kế hoạch hiện tại
        const planning = await manufactureRepo.getBoxById(planningBoxId, machine, transaction);
        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        // 2. Cộng dồn số lượng mới vào số đã có
        const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
        const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);

        const mergedShift = mergeShiftField(planning.shiftManagement ?? "", shiftManagement);

        const isCompletedOrder = newQtyProduced >= (planning.runningPlan || 0);

        const overflow = await planningHelper.getModelById({
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

          await planningHelper.updateDataModel({
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
          await planningHelper.updateDataModel({
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
          await planningHelper.updateDataModel({
            model: planning,
            data: { status: "lackOfQty" },
            options: { transaction },
          });
        }

        // 3. tạo report theo số lần báo cáo
        const reportCreated = await createReportPlanning({
          planning: planning.toJSON(),
          model: ReportPlanningBox,
          qtyProduced: qtyProduced,
          qtyWasteNorm: rpWasteLoss,
          dayReportValue: new Date(dayReportValue ?? ""),
          shiftManagementBox: shiftManagement,
          machine: planning.machine,
          reportedBy: employee.fullName,
          transaction,
          isBox: true,
        });

        //--------------------MEILISEARCH-----------------------
        const boxId = planning.PlanningBox.planningBoxId;
        const reportId = reportCreated.report.reportBoxId;

        await manuBoxService.syncBoxForMeili(boxId, reportId, transaction);

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

  updateReportBox: async (planningBoxId: number, machine: string, updateData: any) => {
    const { qtyProduced: newQty, rpWasteLoss: newWaste, shiftManagement, reportedBy } = updateData;

    try {
      return await runInTransaction(async (transaction) => {
        if (!reportedBy) {
          throw AppError.BadRequest("Missing employee code", "MISSING_EMPLOYEE_CODE");
        }

        console.log(reportedBy);

        const employee = await manufactureRepo.getEmployeeByCode(reportedBy);
        if (!employee) {
          throw AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
        }

        //check report existed
        const oldReport = await manufactureRepo.getReportBoxByPlanningBoxId(
          planningBoxId,
          machine,
          transaction,
        );
        if (!oldReport) {
          throw AppError.NotFound("Report not found", "REPORT_NOT_FOUND");
        }

        const planning = await manufactureRepo.getBoxById(planningBoxId, machine, transaction);
        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        const otherReportsSum =
          (await ReportPlanningBox.sum("qtyProduced", {
            where: {
              planningBoxId: planningBoxId,
              machine: machine,
              reportBoxId: { [Op.ne]: oldReport.reportBoxId },
            },
            transaction,
          })) || 0;

        // Tính lại lackOfQty cho bản báo cáo này
        const totalQtyProduced = Number(otherReportsSum) + Number(newQty);
        const newLackOfQty = (planning.runningPlan || 0) - totalQtyProduced;

        //update report box
        const reportUpdated = await oldReport.update(
          {
            qtyProduced: newQty,
            wasteLoss: newWaste,
            lackOfQty: newLackOfQty,
            shiftManagement: shiftManagement,
            reportedBy: employee.fullName,
          },
          { transaction },
        );

        // Lấy tất cả các lần báo cáo của planning này
        const allReports = await ReportPlanningBox.findAll({
          where: { planningBoxId: planningBoxId, machine: machine },
          transaction,
        });

        // Tính tổng phế liệu từ tất cả báo cáo
        const totalQtyWaste = allReports.reduce((sum, r) => sum + Number(r.wasteLoss || 0), 0);

        // Gom chuỗi shiftProduction và shiftManagement
        const { combinedShiftManagement } = aggregateReportFields(allReports);

        await planning.update(
          {
            qtyProduced: totalQtyProduced,
            rpWasteLoss: totalQtyWaste,
            status: totalQtyProduced >= (planning.runningPlan || 0) ? planning.status : "lackOfQty",
            shiftManagement: combinedShiftManagement,
          },
          { transaction },
        );

        //--------------------MEILISEARCH-----------------------
        const boxId = planning.PlanningBox.planningBoxId;
        const reportId = reportUpdated.reportBoxId;

        await manuBoxService.syncBoxForMeili(boxId, reportId, transaction);

        return { message: "Update Report successfully", data: oldReport };
      });
    } catch (error) {
      console.error("Error update Report box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  syncBoxForMeili: async (boxId: number, reportBoxId: number, transaction: Transaction) => {
    try {
      //update planningBox
      const fullBox = await planningBoxRepository.syncPlanningBoxToMeili({
        whereCondition: { planningBoxId: boxId },
        transaction,
      });

      if (fullBox && fullBox.length > 0) {
        const flattenData = fullBox.map(meiliTransformer.planningBox);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.PLANNING_BOXES,
          data: flattenData,
          transaction,
        });
      }

      //update report
      const updateReportData = await reportRepository.syncReportBoxesForMeili(
        reportBoxId,
        transaction,
      );

      if (updateReportData) {
        const flattenedReport = meiliTransformer.reportBox(updateReportData);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.REPORT_BOXES,
          data: flattenedReport,
          transaction,
        });
      }
    } catch (error) {
      console.error("Error update meilisearch for box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmProducingBox: async (req: Request, planningBoxId: number, machine: string, user: any) => {
    // const { role, permissions: userPermissions } = user;

    try {
      const result = await runInTransaction(async (transaction) => {
        // Lấy planning cần update
        const planning = await planningHelper.getModelById({
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
        await manufactureRepo.updatePlanningBoxTime(planningBoxId, machine, transaction);

        // Update sang producing
        await planningHelper.updateDataModel({
          model: planning,
          data: { status: "producing" },
          options: { transaction },
        });

        //--------------------MEILISEARCH-----------------------
        const fullBox = await planningBoxRepository.syncPlanningBoxToMeili({
          whereCondition: { planningBoxId: planning.planningBoxId },
          transaction,
        });

        if (fullBox && fullBox.length > 0) {
          const flattenData = fullBox.map(meiliTransformer.planningBox);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.PLANNING_BOXES,
            data: flattenData,
            transaction,
          });
        }

        return { message: "Confirm producing box successfully", data: planning };
      });

      // --- GỬI SOCKET SAU KHI TRANSACTION THÀNH CÔNG ---
      if (result.data) {
        await planningPaperService.notifyUpdatePlanning({
          req,
          isPlan: false,
          machine: result.data.machine,
          keyName: "planningBoxUpdated",
          senderId: user?.userId,
        });
      }

      return result;
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
        const planningBox = await manufactureRepo.getBoxByPK(planningBoxId, machine, transaction);
        if (!planningBox) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        if (planningBox.statusRequest == "requested") {
          throw AppError.BadRequest(
            "Đơn này đã yêu cầu kiểm tra rồi",
            "PLANNING_ALREADY_REQUESTED",
          );
        }

        const steps = await manufactureRepo.getAllBoxTimeById(planningBoxId, transaction);

        //check qty produced
        const checkQtyProduced = steps.some(
          (step) => step.qtyProduced == null || step.qtyProduced <= 0,
        );

        if (checkQtyProduced) {
          throw AppError.BadRequest("has step quantiy equal zero", "STEP_QUANTITY_EQUAL_ZERO");
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
