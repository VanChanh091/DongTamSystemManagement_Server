"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manuPaperService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const planningBox_1 = require("../../models/planning/planningBox");
const planningPaper_1 = require("../../models/planning/planningPaper");
const reportRepository_1 = require("../../repository/reportRepository");
const labelFields_1 = require("../../assets/labelFields");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const planningPaperService_1 = require("../planning/planningPaperService");
const manufactureRepository_1 = require("../../repository/manufactureRepository");
const reportPlanningPaper_1 = require("../../models/report/reportPlanningPaper");
const planning_timeRunning_helper_1 = require("../../utils/helper/modelHelper/planning.timeRunning.helper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const reportHelper_1 = require("../../utils/helper/modelHelper/reportHelper");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const manufactureHelper_1 = require("../../utils/helper/modelHelper/manufactureHelper");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
exports.manuPaperService = {
    getPlanningPaper: async ({ machine, filterType = "all", }) => {
        try {
            const planning = await manufactureRepository_1.manufactureRepo.getManufacturePaper(machine, filterType);
            const allPlannings = [];
            const overflowRemoveFields = ["runningPlan", "quantityManufacture"];
            planning.forEach((planning) => {
                const original = {
                    ...planning.toJSON(),
                    timeRunning: planning.timeRunning,
                    dayStart: planning.dayStart,
                };
                allPlannings.push(original);
                if (planning.timeOverFlow) {
                    const overflow = { ...planning.toJSON() };
                    overflow.isOverflow = true;
                    overflow.dayStart = planning.timeOverFlow.overflowDayStart;
                    overflow.timeRunning = planning.timeOverFlow.overflowTimeRunning;
                    overflow.dayCompleted = planning.timeOverFlow.overflowDayCompleted;
                    overflowRemoveFields.forEach((f) => delete overflow[f]);
                    if (overflow.Order) {
                        ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach((item) => delete overflow.Order[item]);
                    }
                    allPlannings.push(overflow);
                }
            });
            return {
                message: `get planning paper by machine: ${machine}`,
                data: allPlannings,
            };
        }
        catch (error) {
            console.error("Failed to get planning paper", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getPaperByDateAndShift: async ({ machine, dayCompleted, shiftProduction, }) => {
        try {
            if (!machine || !dayCompleted || !shiftProduction) {
                throw appError_1.AppError.BadRequest("Missing required parameters", "MISSING_PARAMETERS");
            }
            const plannings = await manufactureRepository_1.manufactureRepo.getPlanningByDateAndShift({
                machine,
                dayCompleted,
                shiftProduction,
            });
            // console.log(`length: ${plannings.length}`);
            // console.log(`plannings: ${JSON.stringify(plannings)}`);
            if (plannings.length === 0) {
                return { message: "No planning papers found", data: [] };
            }
            return { message: "Get planning papers by date and shift successfully", data: plannings };
        }
        catch (error) {
            console.error("Error get paper by date:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    addReportPaper: async ({ planningId, data, user, }) => {
        const { role, permissions: userPermissions } = user;
        const { qtyProduced, dayCompleted, reportedBy, ...otherData } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!planningId || !qtyProduced || !dayCompleted) {
                    throw appError_1.AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
                }
                const employee = await manufactureRepository_1.manufactureRepo.getEmployeeByCode(reportedBy, transaction);
                if (!employee) {
                    throw appError_1.AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
                }
                // 1. Tìm kế hoạch hiện tại
                const planning = await manufactureRepository_1.manufactureRepo.getPapersById(planningId, transaction);
                if (!planning) {
                    throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
                }
                const machine = planning.chooseMachine;
                const machineLabel = labelFields_1.machineLabels[machine];
                if (!machineLabel) {
                    throw appError_1.AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
                }
                //check permission for machine
                if (role !== "admin" && role !== "manager") {
                    if (!userPermissions.includes(machineLabel)) {
                        throw appError_1.AppError.Unauthorized(`Access denied: You don't have permission to report for machine ${machine}`, "ACCESS_DENIED");
                    }
                }
                // 2. Cộng dồn số lượng mới vào số đã có
                const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
                const isCompleted = newQtyProduced >= planning.runningPlan;
                // Logic Overflow
                const isOverflowReport = planning.hasOverFlow &&
                    planning.timeOverFlow &&
                    new Date(dayCompleted) >= new Date(planning.timeOverFlow?.overflowDayStart ?? "");
                let overflow, dayReportValue;
                if (planning.hasOverFlow) {
                    overflow = await crud_helper_repository_1.CrudHelper.findOne({
                        model: timeOverflowPlanning_1.timeOverflowPlanning,
                        where: { planningId },
                        options: { transaction, lock: transaction?.LOCK.UPDATE },
                    });
                    if (!overflow) {
                        throw appError_1.AppError.NotFound("Overflow plan not found", "OVERFLOW_PLAN_NOT_FOUND");
                    }
                }
                dayReportValue = new Date(dayCompleted);
                if (isOverflowReport) {
                    await overflow?.update({ overflowDayCompleted: dayReportValue }, { transaction });
                }
                // Merge shift fields
                let updatedShiftProduction = (0, planning_timeRunning_helper_1.mergeShiftField)(planning.shiftProduction || "", otherData.shiftProduction);
                let updatedShiftManagement = (0, planning_timeRunning_helper_1.mergeShiftField)(planning.shiftManagement || "", otherData.shiftManagement);
                await crud_helper_repository_1.CrudHelper.updateData({
                    model: planning,
                    data: {
                        qtyProduced: newQtyProduced,
                        status: isCompleted ? planning.status : "lackQty",
                        dayCompleted: isOverflowReport ? planning.dayCompleted : dayReportValue,
                        shiftProduction: updatedShiftProduction,
                        shiftManagement: updatedShiftManagement,
                    },
                    options: { transaction },
                });
                //update qty for planning box
                if (planning.hasBox) {
                    const planningBox = await crud_helper_repository_1.CrudHelper.findOne({
                        model: planningBox_1.PlanningBox,
                        where: { orderId: planning.orderId, planningId: planning.planningId },
                        options: { transaction, lock: transaction?.LOCK.UPDATE },
                    });
                    if (!planningBox) {
                        throw appError_1.AppError.NotFound("PlanningBox not found", "PLANNING_BOX_NOT_FOUND");
                    }
                    await planningBox.update({ qtyPaper: newQtyProduced }, { transaction });
                }
                //check qty to change status order
                const allPlans = await manufactureRepository_1.manufactureRepo.getPapersByOrderId(planning.orderId, transaction);
                const totalQtyProduced = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
                const quantityManufacture = planning.Order?.quantityManufacture || 0;
                //update status if enough qty
                if (totalQtyProduced >= quantityManufacture) {
                    await crud_helper_repository_1.CrudHelper.updateData({
                        model: order_1.Order,
                        data: { status: "planning" },
                        options: { where: { orderId: planning.orderId }, transaction },
                    });
                }
                //3. tạo report theo số lần báo cáo
                const reportCreated = await (0, reportHelper_1.createReportPlanning)({
                    planning: planning.toJSON(),
                    model: reportPlanningPaper_1.ReportPlanningPaper,
                    qtyProduced,
                    dayReportValue,
                    reportedBy: employee.fullName,
                    totalPrice: Number(qtyProduced) * planning.Order.pricePaper,
                    otherData,
                    transaction,
                });
                //chuyển sang trang chờ kiểm
                await planning.update({ statusRequest: "requested" }, { transaction });
                //--------------------MEILISEARCH-----------------------
                const reportId = reportCreated.report.reportPaperId;
                await exports.manuPaperService.syncPaperForMeili({ reportId, planningData: planning, transaction });
                return {
                    message: "Add Report Production successfully",
                    data: {
                        planningId,
                        qtyProduced: newQtyProduced,
                        dayCompleted,
                        ...otherData,
                    },
                };
            });
        }
        catch (error) {
            console.error("Error add Report paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateReportPaper: async ({ planningId, updateData, user, }) => {
        const { role, permissions: userPermissions } = user;
        const { qtyProduced: newQty, reportedBy, ...otherData } = updateData;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!reportedBy) {
                    throw appError_1.AppError.BadRequest("Missing employee code", "MISSING_EMPLOYEE_CODE");
                }
                const employee = await manufactureRepository_1.manufactureRepo.getEmployeeByCode(reportedBy, transaction);
                if (!employee) {
                    throw appError_1.AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
                }
                //check report existed
                const oldReport = await manufactureRepository_1.manufactureRepo.getReportPaperByPlanningId(planningId, transaction);
                if (!oldReport) {
                    throw appError_1.AppError.NotFound("Report not found", "REPORT_NOT_FOUND");
                }
                const planning = await manufactureRepository_1.manufactureRepo.getOldPlanningPaper(planningId, transaction);
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                //check permission for machine
                const machineLabel = labelFields_1.machineLabels[planning.chooseMachine];
                if (role !== "admin" && role !== "manager") {
                    if (!userPermissions.includes(machineLabel)) {
                        throw appError_1.AppError.Unauthorized("Access denied for this machine", "ACCESS_DENIED");
                    }
                }
                const otherReportsSum = (await reportPlanningPaper_1.ReportPlanningPaper.sum("qtyProduced", {
                    where: {
                        planningId: planning.planningId,
                        reportPaperId: { [sequelize_1.Op.ne]: oldReport.reportPaperId },
                    },
                    transaction,
                })) || 0;
                // Tính lại lackOfQty cho bản báo cáo này
                const totalQtyProduced = Number(otherReportsSum) + Number(newQty);
                const newLackOfQty = planning.runningPlan - totalQtyProduced;
                let newTotalLength = 0;
                const length = (planning.lengthPaperPlanning || 0) / 100;
                const child = planning.numberChild || 1;
                // Tính lại tổng chiều dài dựa theo sản lượng mới
                planning?.Order?.dvt === "Kg"
                    ? (newTotalLength = Number(newQty || 0))
                    : (newTotalLength = (Number(newQty || 0) * length) / child);
                //Lấy lại số phút chạy cũ đã tính từ lúc tạo report
                const durationMinutes = oldReport.durations || 0;
                const parseTotalLength = Math.round(newTotalLength * 100) / 100;
                // Tính lại tốc độ bình quân mới cho lượt báo cáo này
                const newSpeed = durationMinutes > 0 ? Math.round((parseTotalLength / durationMinutes) * 100) / 100 : 0;
                //update report paper
                const reportUpdated = await oldReport.update({
                    qtyProduced: newQty,
                    lackOfQty: newLackOfQty,
                    reportedBy: employee.fullName,
                    totalPrice: Number(newQty) * planning.Order.pricePaper,
                    totalLength: parseTotalLength,
                    averageSpeed: newSpeed,
                    ...otherData,
                }, { transaction });
                // Lấy tất cả các lần báo cáo của planning này để gom lại
                const allReports = await reportPlanningPaper_1.ReportPlanningPaper.findAll({
                    where: { planningId: planning.planningId },
                    transaction,
                });
                // Gom chuỗi shiftProduction và shiftManagement
                const { combinedShiftProduction, combinedShiftManagement } = (0, manufactureHelper_1.aggregateReportFields)(allReports);
                const planningUpdated = await planning.update({
                    qtyProduced: totalQtyProduced,
                    status: totalQtyProduced >= planning.runningPlan ? planning.status : "lackQty",
                    shiftProduction: combinedShiftProduction,
                    shiftManagement: combinedShiftManagement,
                }, { transaction });
                //update planning box nếu có
                if (planning.hasBox) {
                    const planningBox = await planningBox_1.PlanningBox.findOne({
                        where: { orderId: planning.orderId, planningId: planning.planningId },
                        transaction,
                        lock: transaction?.LOCK.UPDATE,
                    });
                    if (planningBox) {
                        await planningBox.update({ qtyPaper: totalQtyProduced }, { transaction });
                    }
                }
                //check qty to change status order
                const allPlans = await manufactureRepository_1.manufactureRepo.getPapersByOrderId(planning.orderId, transaction);
                const totalOrderQty = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
                const quantityManufacture = planning.Order?.quantityManufacture || 0;
                if (totalOrderQty >= quantityManufacture) {
                    await crud_helper_repository_1.CrudHelper.updateData({
                        model: order_1.Order,
                        data: { status: "planning" },
                        options: { where: { orderId: planning.orderId }, transaction },
                    });
                }
                //--------------------MEILISEARCH-----------------------
                const reportId = reportUpdated.reportPaperId;
                await exports.manuPaperService.syncPaperForMeili({
                    reportId,
                    planningData: planningUpdated,
                    transaction,
                });
                return { message: "Update Report successfully", data: oldReport };
            });
        }
        catch (error) {
            console.error("Error update Report paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    syncPaperForMeili: async ({ reportId, planningData, transaction, }) => {
        try {
            await meiliService_1.meiliService.syncOrUpdateMeiliData({
                indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                data: {
                    planningId: planningData.planningId,
                    status: planningData.status,
                },
                transaction,
                isUpdate: true,
            });
            const addReportData = await reportRepository_1.reportRepository.syncReportPaperForMeili(reportId, transaction);
            if (addReportData) {
                const flattenedReport = meiliTransformer_1.meiliTransformer.reportPaper(addReportData);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.REPORT_PAPERS,
                    data: flattenedReport,
                    transaction,
                });
            }
        }
        catch (error) {
            console.error("Error update meilisearch paper box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmProducingPaper: async ({ req, planningId, user, }) => {
        const { role, permissions: userPermissions } = user;
        try {
            const result = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const planning = await planningPaper_1.PlanningPaper.findOne({
                    where: { planningId },
                    transaction,
                    lock: transaction?.LOCK.UPDATE, // lock để tránh race condition
                });
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                // check permission
                const machine = planning.chooseMachine;
                const machineLabel = labelFields_1.machineLabels[machine];
                if (!machineLabel) {
                    throw appError_1.AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
                }
                if (role !== "admin" && role !== "manager") {
                    if (!userPermissions.includes(machineLabel)) {
                        throw appError_1.AppError.Forbidden(`Access denied: You don't have permission to report for machine ${machine}`, "ACCESS_DENIED");
                    }
                }
                // Check if the planning is already completed
                if (planning.status === "complete") {
                    throw appError_1.AppError.Conflict("Planning already completed", "PLANNING_HAS_COMPLETED");
                }
                // Check if there's another planning in 'producing' status for the same machine
                const existingProducing = await crud_helper_repository_1.CrudHelper.findOne({
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine, status: "producing" },
                    options: { transaction, lock: transaction?.LOCK.UPDATE },
                });
                if (existingProducing && existingProducing.planningId !== planningId) {
                    await crud_helper_repository_1.CrudHelper.updateData({
                        model: existingProducing,
                        data: { status: "planning" },
                        options: { transaction },
                    });
                }
                await crud_helper_repository_1.CrudHelper.updateData({
                    model: planning,
                    data: { status: "producing" },
                    options: { transaction },
                });
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                    data: { planningId: planning.planningId, status: "producing" },
                    transaction,
                    isUpdate: true,
                });
                return { message: "Confirm producing paper successfully", data: planning };
            });
            // --- GỬI SOCKET SAU KHI TRANSACTION THÀNH CÔNG ---
            if (result.data) {
                await planningPaperService_1.planningPaperService.notifyUpdatePlanning({
                    req,
                    isPlan: false,
                    machine: result.data.chooseMachine,
                    keyName: "planningPaperUpdated",
                    senderId: user?.userId,
                });
            }
            return result;
        }
        catch (error) {
            console.error("Error confirming producing paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    requestCompletePlanningPaper: async ({ planningId }) => {
        try {
            return await (0, manufactureHelper_1.updateStatusPaper)({
                planningId,
                targetStatus: "requested",
                extraValidator: (papers) => {
                    for (const p of papers) {
                        if (p.status === "requested") {
                            throw appError_1.AppError.BadRequest(`Đơn hàng ${p.orderId} đã được yêu cầu hoàn thành rồi`, "PLANNING_ALREADY_REQUESTED");
                        }
                        if ((p.qtyProduced ?? 0) === 0) {
                            throw appError_1.AppError.BadRequest(`Đơn hàng ${p.orderId} chưa có số lượng sản xuất`, "PLANNING_NO_PRODUCED_QUANTITY");
                        }
                    }
                },
            });
        }
        catch (error) {
            console.log(`error request complete planning paper`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //confirm fixed err from qc check
    confirmFixedErr: async ({ planningId }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const planning = await planningPaper_1.PlanningPaper.findOne({
                    where: { planningId },
                    transaction,
                    lock: transaction?.LOCK.UPDATE,
                });
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                if (planning.statusCheck !== "failed") {
                    throw appError_1.AppError.BadRequest(`Chỉ có thể xác nhận đơn hàng đang bị lỗi`, "PLANNING_NOT_FAILED");
                }
                await planning.update({ statusCheck: "fixed" }, { transaction });
                return { message: "Confirm fixed error successfully" };
            });
        }
        catch (error) {
            console.log(`error confirm fixed error`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=manufacturePaperService.js.map