import dotenv from "dotenv";
dotenv.config();

import { Request } from "express";
import { Op, Transaction } from "sequelize";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { reportRepository } from "../../repository/reportRepository";
import { machineLabels, MEILI_INDEX } from "../../assets/labelFields";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { planningPaperService } from "../planning/planningPaperService";
import { manufactureRepo } from "../../repository/manufactureRepository";
import { planningHelper } from "../../repository/planning/planningHelper";
import { ReportPlanningPaper } from "../../models/report/reportPlanningPaper";
import { mergeShiftField } from "../../utils/helper/modelHelper/planningHelper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { createReportPlanning } from "../../utils/helper/modelHelper/reportHelper";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { aggregateReportFields } from "../../utils/helper/modelHelper/manufactureHelper";

export const manuPaperService = {
  getPlanningPaper: async (machine: string, filterType: string = "all") => {
    try {
      const planning = await manufactureRepo.getManufacturePaper(machine, filterType);

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
    const { qtyProduced, qtyWasteNorm, dayCompleted, reportedBy, ...otherData } = data;

    try {
      return await runInTransaction(async (transaction) => {
        if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
          throw AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
        }

        const employee = await manufactureRepo.getEmployeeByCode(reportedBy, transaction);
        if (!employee) {
          throw AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
        }

        // 1. Tìm kế hoạch hiện tại
        const planning = await manufactureRepo.getPapersById(planningId, transaction);
        if (!planning) {
          throw AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
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
              "ACCESS_DENIED",
            );
          }
        }

        // 2. Cộng dồn số lượng mới vào số đã có
        const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
        const newQtyWasteNorm = Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);

        // update status dựa trên qtyProduced
        const isCompleted = newQtyProduced >= planning.runningPlan;

        // Logic Overflow
        const isOverflowReport =
          planning.hasOverFlow &&
          planning.timeOverFlow &&
          new Date(dayCompleted) >= new Date(planning.timeOverFlow?.overflowDayStart ?? "");

        let overflow, dayReportValue;

        if (planning.hasOverFlow) {
          overflow = await planningHelper.getModelById({
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
          otherData.shiftProduction,
        );

        let updatedShiftManagement = mergeShiftField(
          planning.shiftManagement || "",
          otherData.shiftManagement,
        );

        await planningHelper.updateDataModel({
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
          const planningBox = await planningHelper.getModelById({
            model: PlanningBox,
            where: { orderId: planning.orderId, planningId: planning.planningId },
            options: { transaction, lock: transaction?.LOCK.UPDATE },
          });
          if (!planningBox) {
            throw AppError.NotFound("PlanningBox not found", "PLANNING_BOX_NOT_FOUND");
          }

          await planningBox.update({ qtyPaper: newQtyProduced }, { transaction });
        }

        //check qty to change status order
        const allPlans = await manufactureRepo.getPapersByOrderId(planning.orderId, transaction);

        const totalQtyProduced = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
        const quantityManufacture = planning.Order?.quantityManufacture || 0;

        //update stauts if enough qty
        if (totalQtyProduced >= quantityManufacture) {
          await planningHelper.updateDataModel({
            model: Order,
            data: { status: "planning" },
            options: { where: { orderId: planning.orderId }, transaction },
          });
        }

        //3. tạo report theo số lần báo cáo
        const reportCreated = await createReportPlanning({
          planning: planning.toJSON(),
          model: ReportPlanningPaper,
          qtyProduced,
          qtyWasteNorm,
          dayReportValue,
          reportedBy: employee.fullName,
          otherData,
          transaction,
        });

        //chuyển sang trang chờ kiểm
        await planning.update({ statusRequest: "requested" }, { transaction });

        //--------------------MEILISEARCH-----------------------
        const reportId = reportCreated.report.reportPaperId;
        await manuPaperService.syncPaperForMeili(reportId, planning, transaction);

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
      console.error("Error add Report paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateReportPaper: async (planningId: number, updateData: any, user: any) => {
    const { role, permissions: userPermissions } = user;
    const { qtyProduced: newQty, qtyWasteNorm: newWaste, reportedBy, ...otherData } = updateData;

    try {
      return await runInTransaction(async (transaction) => {
        if (!reportedBy) {
          throw AppError.BadRequest("Missing employee code", "MISSING_EMPLOYEE_CODE");
        }

        const employee = await manufactureRepo.getEmployeeByCode(reportedBy);
        if (!employee) {
          throw AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
        }

        //check report existed
        const oldReport = await manufactureRepo.getReportPaperByPlanningId(planningId, transaction);
        if (!oldReport) {
          throw AppError.NotFound("Report not found", "REPORT_NOT_FOUND");
        }

        const planning = await manufactureRepo.getOldPlanningPaper(planningId, transaction);
        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        //check permission for machine
        const machineLabel = machineLabels[planning.chooseMachine];
        if (role !== "admin" && role !== "manager") {
          if (!userPermissions.includes(machineLabel)) {
            throw AppError.Unauthorized("Access denied for this machine", "ACCESS_DENIED");
          }
        }

        const otherReportsSum =
          (await ReportPlanningPaper.sum("qtyProduced", {
            where: {
              planningId: planning.planningId,
              reportPaperId: { [Op.ne]: oldReport.reportPaperId },
            },
            transaction,
          })) || 0;

        // Tính lại lackOfQty cho bản báo cáo này
        const totalQtyProduced = Number(otherReportsSum) + Number(newQty);
        const newLackOfQty = planning.runningPlan - totalQtyProduced;

        //update report paper
        const reportUpdated = await oldReport.update(
          {
            qtyProduced: newQty,
            qtyWasteNorm: newWaste,
            lackOfQty: newLackOfQty,
            reportedBy: employee.fullName,
            ...otherData,
          },
          { transaction },
        );

        // Lấy tất cả các lần báo cáo của planning này để gom lại
        const allReports = await ReportPlanningPaper.findAll({
          where: { planningId: planning.planningId },
          transaction,
        });

        // Tính tổng phế liệu từ tất cả báo cáo
        const totalQtyWaste = allReports.reduce((sum, r) => sum + Number(r.qtyWasteNorm || 0), 0);

        // Gom chuỗi shiftProduction và shiftManagement
        const { combinedShiftProduction, combinedShiftManagement } =
          aggregateReportFields(allReports);

        const planningUpdated = await planning.update(
          {
            qtyProduced: totalQtyProduced,
            qtyWasteNorm: totalQtyWaste,
            status: totalQtyProduced >= planning.runningPlan ? planning.status : "lackQty",
            shiftProduction: combinedShiftProduction,
            shiftManagement: combinedShiftManagement,
          },
          { transaction },
        );

        //update planning box nếu có
        if (planning.hasBox) {
          const planningBox = await PlanningBox.findOne({
            where: { orderId: planning.orderId, planningId: planning.planningId },
            transaction,
            lock: transaction?.LOCK.UPDATE,
          });

          if (planningBox) {
            await planningBox.update({ qtyPaper: totalQtyProduced }, { transaction });
          }
        }

        //check qty to change status order
        const allPlans = await manufactureRepo.getPapersByOrderId(planning.orderId, transaction);

        const totalOrderQty = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
        const quantityManufacture = planning.Order?.quantityManufacture || 0;

        if (totalOrderQty >= quantityManufacture) {
          await planningHelper.updateDataModel({
            model: Order,
            data: { status: "planning" },
            options: { where: { orderId: planning.orderId }, transaction },
          });
        }

        //--------------------MEILISEARCH-----------------------
        const reportId = reportUpdated.reportPaperId;
        await manuPaperService.syncPaperForMeili(reportId, planningUpdated, transaction);

        return { message: "Update Report successfully", data: oldReport };
      });
    } catch (error) {
      console.error("Error update Report paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  syncPaperForMeili: async (reportId: number, planningData: any, transaction: Transaction) => {
    try {
      await meiliService.syncOrUpdateMeiliData({
        indexKey: MEILI_INDEX.PLANNING_PAPERS,
        data: {
          planningId: planningData.planningId,
          status: planningData.status,
        },
        transaction,
        isUpdate: true,
      });

      const addReportData = await reportRepository.syncReportPaperForMeili(reportId, transaction);

      if (addReportData) {
        const flattenedReport = meiliTransformer.reportPaper(addReportData);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.REPORT_PAPERS,
          data: flattenedReport,
          transaction,
        });
      }
    } catch (error) {
      console.error("Error update meilisearch paper box:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmProducingPaper: async (req: Request, planningId: number, user: any) => {
    const { role, permissions: userPermissions } = user;

    try {
      const result = await runInTransaction(async (transaction) => {
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
              "ACCESS_DENIED",
            );
          }
        }

        // Check if the planning is already completed
        if (planning.status === "complete") {
          throw AppError.Conflict("Planning already completed", "PLANNING_HAS_COMPLETED");
        }

        // Check if there's another planning in 'producing' status for the same machine
        const existingProducing = await planningHelper.getModelById({
          model: PlanningPaper,
          where: { chooseMachine: machine, status: "producing" },
          options: { transaction, lock: transaction?.LOCK.UPDATE },
        });

        if (existingProducing && existingProducing.planningId !== planningId) {
          await planningHelper.updateDataModel({
            model: existingProducing,
            data: { status: "planning" },
            options: { transaction },
          });
        }

        await planningHelper.updateDataModel({
          model: planning,
          data: { status: "producing" },
          options: { transaction },
        });

        //--------------------MEILISEARCH-----------------------
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.PLANNING_PAPERS,
          data: { planningId: planning.planningId, status: "producing" },
          transaction,
          isUpdate: true,
        });

        return { message: "Confirm producing paper successfully", data: planning };
      });

      // --- GỬI SOCKET SAU KHI TRANSACTION THÀNH CÔNG ---
      if (result.data) {
        await planningPaperService.notifyUpdatePlanning({
          req,
          isPlan: false,
          machine: result.data.chooseMachine,
          keyName: "planningPaperUpdated",
          senderId: user?.userId,
        });
      }

      return result;
    } catch (error) {
      console.error("Error confirming producing paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
