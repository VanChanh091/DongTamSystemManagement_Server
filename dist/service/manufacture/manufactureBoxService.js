"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manuBoxService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const labelFields_1 = require("../../assets/labelFields");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningBoxService_1 = require("../planning/planningBoxService");
const reportRepository_1 = require("../../repository/reportRepository");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const planningPaperService_1 = require("../planning/planningPaperService");
const manufactureRepository_1 = require("../../repository/manufactureRepository");
const reportPlanningBox_1 = require("../../models/report/reportPlanningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const planning_timeRunning_helper_1 = require("../../utils/helper/modelHelper/planning.timeRunning.helper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const reportHelper_1 = require("../../utils/helper/modelHelper/reportHelper");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const planningBoxRepository_1 = require("../../repository/planning/planningBoxRepository");
const manufactureHelper_1 = require("../../utils/helper/modelHelper/manufactureHelper");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { box } = cacheKey_1.CacheKey.manufacture;
exports.manuBoxService = {
    getPlanningBox: async (machine) => {
        try {
            // const cacheKey = box.machine(machine);
            // const { isChanged } = await CacheManager.check(
            //   [
            //     { model: PlanningBox },
            //     { model: PlanningBoxTime },
            //     { model: timeOverflowPlanning, where: { planningBoxId: { [Op.ne]: null } } },
            //   ],
            //   "manufactureBox",
            // );
            // if (isChanged) {
            //   await CacheManager.clear("manufactureBox");
            // } else {
            //   const cachedData = await redisCache.get(cacheKey);
            //   if (cachedData) {
            //     if (devEnvironment) console.log("✅ Data manufacture box from Redis");
            //     return {
            //       message: `get filtered cached planning:box:machine:${machine}`,
            //       data: JSON.parse(cachedData),
            //     };
            //   }
            // }
            const planning = await manufactureRepository_1.manufactureRepo.buildQueryManuBoxes({
                machine,
                targetStatus: { [sequelize_1.Op.notIn]: ["complete", "stop"] },
            });
            const allPlannings = [];
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
            // await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);
            return { message: `get planning by machine: ${machine}`, data: allPlannings };
        }
        catch (error) {
            console.error("Failed to get planning box", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    addReportBox: async (planningBoxId, machine, data) => {
        const { qtyProduced, dayCompleted, rpWasteLoss, shiftManagement, reportedBy } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !reportedBy) {
                    throw appError_1.AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
                }
                const employee = await manufactureRepository_1.manufactureRepo.getEmployeeByCode(reportedBy, transaction);
                if (!employee) {
                    throw appError_1.AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
                }
                // 1. Tìm kế hoạch hiện tại
                const planning = await manufactureRepository_1.manufactureRepo.getBoxById(planningBoxId, machine, transaction);
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                // 2. Cộng dồn số lượng mới vào số đã có
                const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
                const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);
                const mergedShift = (0, planning_timeRunning_helper_1.mergeShiftField)(planning.shiftManagement ?? "", shiftManagement);
                const isCompletedOrder = newQtyProduced >= (planning.runningPlan || 0);
                const overflow = await crud_helper_repository_1.CrudHelper.findOne({
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    where: { planningBoxId, machine },
                    options: { transaction, lock: transaction?.LOCK.UPDATE },
                });
                //condition
                const isOverflowReport = !!overflow &&
                    overflow.overflowDayStart &&
                    new Date(dayCompleted) >= new Date(overflow.overflowDayStart);
                let dayReportValue;
                if (isOverflowReport) {
                    await overflow?.update({ overflowDayCompleted: new Date(dayCompleted) }, { transaction });
                    await crud_helper_repository_1.CrudHelper.updateData({
                        model: planning,
                        data: {
                            qtyProduced: newQtyProduced,
                            rpWasteLoss: newQtyWasteNorm,
                            shiftManagement: mergedShift,
                        },
                        options: { transaction },
                    });
                    dayReportValue = overflow?.getDataValue("overflowDayCompleted");
                }
                else {
                    //Cập nhật kế hoạch với số liệu mới
                    await crud_helper_repository_1.CrudHelper.updateData({
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
                    await crud_helper_repository_1.CrudHelper.updateData({
                        model: planning,
                        data: { status: "lackOfQty" },
                        options: { transaction },
                    });
                }
                // 3. tạo report theo số lần báo cáo
                const reportCreated = await (0, reportHelper_1.createReportPlanning)({
                    planning: planning.toJSON(),
                    model: reportPlanningBox_1.ReportPlanningBox,
                    qtyProduced: qtyProduced,
                    qtyWasteNorm: rpWasteLoss,
                    dayReportValue: new Date(dayReportValue ?? ""),
                    shiftManagementBox: shiftManagement,
                    machine: planning.machine,
                    reportedBy: employee.fullName,
                    totalPrice: Number(qtyProduced) * planning.PlanningBox.Order.pricePaper,
                    isBox: true,
                    transaction,
                });
                // 4. check công đoạn cuối của đơn hàng
                const allStages = await planningBoxMachineTime_1.PlanningBoxTime.findAll({
                    where: { planningBoxId },
                    attributes: ["boxTimeId", "qtyProduced", "machine"],
                    transaction,
                });
                let isLastStage = true;
                for (const stage of allStages) {
                    if (stage.machine === machine) {
                        // Đối với công đoạn hiện tại đang báo cáo, ta check theo số lượng mới sau khi cộng dồn (newQtyProduced)
                        if (!newQtyProduced || Number(newQtyProduced) <= 0) {
                            isLastStage = false;
                            break;
                        }
                    }
                    else {
                        // Đối với các công đoạn khác, nếu có bất kỳ công đoạn nào chưa có số lượng (null, undefined hoặc <= 0)
                        if (!stage.qtyProduced || Number(stage.qtyProduced) <= 0) {
                            isLastStage = false;
                            break;
                        }
                    }
                }
                //--------------------MEILISEARCH-----------------------
                const boxId = planning.PlanningBox.planningBoxId;
                const reportId = reportCreated.report.reportBoxId;
                await exports.manuBoxService.syncBoxForMeili(boxId, reportId, transaction);
                return {
                    message: "Add Report Production successfully",
                    data: {
                        planningBoxId,
                        machine,
                        qtyProduced: newQtyProduced,
                        dayCompleted,
                        shiftManagement,
                        status: isCompletedOrder ? planning.status : "lackQty",
                        isLastStage,
                    },
                };
            });
        }
        catch (error) {
            console.error("Error add Report Production:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateReportBox: async (planningBoxId, machine, updateData) => {
        const { qtyProduced: newQty, rpWasteLoss: newWaste, shiftManagement, reportedBy } = updateData;
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
                const oldReport = await manufactureRepository_1.manufactureRepo.getReportBoxByPlanningBoxId(planningBoxId, machine, transaction);
                if (!oldReport) {
                    throw appError_1.AppError.NotFound("Report not found", "REPORT_NOT_FOUND");
                }
                const planning = await manufactureRepository_1.manufactureRepo.getBoxById(planningBoxId, machine, transaction);
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                const otherReportsSum = (await reportPlanningBox_1.ReportPlanningBox.sum("qtyProduced", {
                    where: {
                        planningBoxId: planningBoxId,
                        machine: machine,
                        reportBoxId: { [sequelize_1.Op.ne]: oldReport.reportBoxId },
                    },
                    transaction,
                })) || 0;
                // Tính lại lackOfQty cho bản báo cáo này
                const totalQtyProduced = Number(otherReportsSum) + Number(newQty);
                const newLackOfQty = (planning.runningPlan || 0) - totalQtyProduced;
                //update report box
                const reportUpdated = await oldReport.update({
                    qtyProduced: newQty,
                    wasteLoss: newWaste,
                    lackOfQty: newLackOfQty,
                    shiftManagement: shiftManagement,
                    reportedBy: employee.fullName,
                }, { transaction });
                // Lấy tất cả các lần báo cáo của planning này
                const allReports = await reportPlanningBox_1.ReportPlanningBox.findAll({
                    where: { planningBoxId: planningBoxId, machine: machine },
                    transaction,
                });
                // Gom chuỗi shiftProduction và shiftManagement
                const { combinedShiftManagement } = (0, manufactureHelper_1.aggregateReportFields)(allReports);
                // Tính tổng phế liệu từ tất cả báo cáo
                const totalQtyWaste = allReports.reduce((sum, r) => sum + Number(r.wasteLoss || 0), 0);
                await planning.update({
                    qtyProduced: totalQtyProduced,
                    rpWasteLoss: totalQtyWaste,
                    status: totalQtyProduced >= (planning.runningPlan || 0) ? planning.status : "lackOfQty",
                    shiftManagement: combinedShiftManagement,
                }, { transaction });
                //--------------------MEILISEARCH-----------------------
                const boxId = planning.PlanningBox.planningBoxId;
                const reportId = reportUpdated.reportBoxId;
                await exports.manuBoxService.syncBoxForMeili(boxId, reportId, transaction);
                return { message: "Update Report successfully", data: oldReport };
            });
        }
        catch (error) {
            console.error("Error update Report box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    syncBoxForMeili: async (boxId, reportBoxId, transaction) => {
        try {
            //update planningBox
            const fullBox = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxToMeili({
                whereCondition: { planningBoxId: boxId },
                transaction,
            });
            if (fullBox && fullBox.length > 0) {
                const flattenData = fullBox.map(meiliTransformer_1.meiliTransformer.planningBox);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.PLANNING_BOXES,
                    data: flattenData,
                    transaction,
                });
            }
            //update report
            const updateReportData = await reportRepository_1.reportRepository.syncReportBoxesForMeili(reportBoxId, transaction);
            if (updateReportData) {
                const flattenedReport = meiliTransformer_1.meiliTransformer.reportBox(updateReportData);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.REPORT_BOXES,
                    data: flattenedReport,
                    transaction,
                });
            }
        }
        catch (error) {
            console.error("Error update meilisearch for box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmProducingBox: async (req, planningBoxId, machine, user) => {
        // const { role, permissions: userPermissions } = user;
        try {
            const result = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Lấy planning cần update
                const planning = await crud_helper_repository_1.CrudHelper.findOne({
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: { planningBoxId, machine },
                    options: { transaction, lock: transaction?.LOCK.UPDATE, skipLocked: true },
                });
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
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
                    throw appError_1.AppError.BadRequest("Planning already completed", "PLANNING_HAS_COMPLETED");
                }
                // Reset những thằng đang "producing"
                await manufactureRepository_1.manufactureRepo.updatePlanningBoxTime(planningBoxId, machine, transaction);
                // Update sang producing
                await crud_helper_repository_1.CrudHelper.updateData({
                    model: planning,
                    data: { status: "producing" },
                    options: { transaction },
                });
                //--------------------MEILISEARCH-----------------------
                const fullBox = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxToMeili({
                    whereCondition: { planningBoxId: planning.planningBoxId },
                    transaction,
                });
                if (fullBox && fullBox.length > 0) {
                    const flattenData = fullBox.map(meiliTransformer_1.meiliTransformer.planningBox);
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.PLANNING_BOXES,
                        data: flattenData,
                        transaction,
                    });
                }
                return { message: "Confirm producing box successfully", data: planning };
            });
            // --- GỬI SOCKET SAU KHI TRANSACTION THÀNH CÔNG ---
            if (result.data) {
                await planningPaperService_1.planningPaperService.notifyUpdatePlanning({
                    req,
                    isPlan: false,
                    machine: result.data.machine,
                    keyName: "planningBoxUpdated",
                    senderId: user?.userId,
                });
            }
            return result;
        }
        catch (error) {
            console.error("Error confirming producing box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateRequestStockCheck: async (planningBoxId, machine) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Lấy planning cần update
                const planningBox = await manufactureRepository_1.manufactureRepo.getBoxByPK(planningBoxId, machine, transaction);
                if (!planningBox) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                if (planningBox.statusRequest == "requested") {
                    throw appError_1.AppError.BadRequest("Đơn này đã yêu cầu kiểm tra rồi", "PLANNING_ALREADY_REQUESTED");
                }
                const steps = await manufactureRepository_1.manufactureRepo.getAllBoxTimeById(planningBoxId, transaction);
                //check qty produced
                const checkQtyProduced = steps.some((step) => step.qtyProduced == null || step.qtyProduced <= 0);
                if (checkQtyProduced) {
                    throw appError_1.AppError.BadRequest("has step quantiy equal zero", "STEP_QUANTITY_EQUAL_ZERO");
                }
                await planningBox.update({ statusRequest: "requested" }, { transaction });
                await planningBox.boxTimes?.[0].update({ isRequest: true }, { transaction });
                return { message: "Yêu cầu nhập kho đã được gửi" };
            });
        }
        catch (error) {
            console.error("Error confirming producing box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    requestCompletePlanningBox: async (planningBoxId, machine) => {
        return await planningBoxService_1.planningBoxService._updateStatusBox(planningBoxId, machine, "requested", (boxTimes) => {
            // Kiểm tra sl từng đơn
            for (const box of boxTimes) {
                const { qtyProduced, status } = box;
                if (status === "requested") {
                    throw appError_1.AppError.BadRequest(`Đơn hàng ${box.PlanningBox.orderId} đã được yêu cầu hoàn thành rồi`, "PLANNING_ALREADY_REQUESTED");
                }
                if ((qtyProduced ?? 0) === 0) {
                    throw appError_1.AppError.BadRequest(`Đơn hàng ${box.PlanningBox.orderId} chưa có số lượng sản xuất`, "PLANNING_NO_PRODUCED_QUANTITY");
                }
            }
        });
    },
    //confirm fixed err from qc check
    confirmFixedErr: async (planningBoxId, machine) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const planningBoxTime = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
                    where: { planningBoxId, machine },
                    transaction,
                });
                if (!planningBoxTime) {
                    throw appError_1.AppError.NotFound("Planning Box Time not found", "PLANNING_BOX_TIME_NOT_FOUND");
                }
                if (planningBoxTime.statusCheck !== "failed") {
                    throw appError_1.AppError.BadRequest("Chỉ có thể xác nhận cho công đoạn đang bị lỗi", "PLANNING_NOT_FAILED");
                }
                await planningBoxTime.update({ statusCheck: "fixed" }, { transaction });
                return { message: "Confirm fixed error successfully" };
            });
        }
        catch (error) {
            console.error("Error confirming fixed error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=manufactureBoxService.js.map