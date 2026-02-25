"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manufactureService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const sequelize_1 = require("sequelize");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const appError_1 = require("../utils/appError");
const planningPaper_1 = require("../models/planning/planningPaper");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
const manufactureRepository_1 = require("../repository/manufactureRepository");
const machineLabels_1 = require("../assest/configs/machineLabels");
const planningRepository_1 = require("../repository/planningRepository");
const planningBox_1 = require("../models/planning/planningBox");
const order_1 = require("../models/order/order");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const reportHelper_1 = require("../utils/helper/modelHelper/reportHelper");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const planningHelper_1 = require("../utils/helper/modelHelper/planningHelper");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const planningPaperService_1 = require("./planning/planningPaperService");
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper, box } = cacheKey_1.CacheKey.manufacture;
exports.manufactureService = {
    //====================================PAPER========================================
    getPlanningPaper: async (machine) => {
        try {
            const cacheKey = paper.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "manufacturePaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("manufacturePaper");
                await cacheManager_1.CacheManager.clear("orderAccept");
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data manufacture paper from Redis");
                    return {
                        message: `get filtered cache planning:machine:${machine}`,
                        data: JSON.parse(cachedData),
                    };
                }
            }
            const planning = await manufactureRepository_1.manufactureRepository.getManufacturePaper(machine);
            // Lọc đơn complete chỉ giữ lại trong 1 ngày
            const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const now = truncateToDate(new Date());
            const validData = planning.filter((item) => {
                if (["planning", "lackQty", "producing"].includes(item.status))
                    return true;
                if (item.status === "complete") {
                    const dayCompleted = item.dayCompleted ? new Date(item.dayCompleted) : null;
                    if (!dayCompleted || isNaN(dayCompleted.getTime()))
                        return false;
                    const expiredDate = truncateToDate(new Date(dayCompleted));
                    expiredDate.setDate(expiredDate.getDate() + 1);
                    return expiredDate >= now;
                }
                return false;
            });
            const allPlannings = [];
            const overflowRemoveFields = ["runningPlan", "quantityManufacture"];
            validData.forEach((planning) => {
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
            await redisCache_1.default.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);
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
    addReportPaper: async (planningId, data, user) => {
        const { role, permissions: userPermissions } = user;
        const { qtyProduced, qtyWasteNorm, dayCompleted, ...otherData } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
                    throw appError_1.AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
                }
                // 1. Tìm kế hoạch hiện tại
                const planning = await manufactureRepository_1.manufactureRepository.getPapersById(planningId, transaction);
                if (!planning) {
                    throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
                }
                const machine = planning.chooseMachine;
                const machineLabel = machineLabels_1.machineLabels[machine];
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
                const newQtyWasteNorm = Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);
                // update status dựa trên qtyProduced
                const isCompleted = newQtyProduced >= planning.runningPlan;
                const isOverflowReport = planning.hasOverFlow &&
                    planning.timeOverFlow &&
                    new Date(dayCompleted) >= new Date(planning.timeOverFlow?.overflowDayStart ?? "");
                let overflow, dayReportValue;
                //get timeOverflowPlanning
                if (planning.hasOverFlow) {
                    overflow = await planningRepository_1.planningRepository.getModelById({
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
                let updatedShiftProduction = (0, planningHelper_1.mergeShiftField)(planning.shiftProduction || "", otherData.shiftProduction);
                let updatedShiftManagement = (0, planningHelper_1.mergeShiftField)(planning.shiftManagement || "", otherData.shiftManagement);
                await planningRepository_1.planningRepository.updateDataModel({
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
                    const planningBox = await planningRepository_1.planningRepository.getModelById({
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
                const allPlans = await manufactureRepository_1.manufactureRepository.getPapersByOrderId(planning.orderId, transaction);
                const totalQtyProduced = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
                const quantityCustomer = planning.Order?.quantityCustomer || 0;
                if (totalQtyProduced >= quantityCustomer) {
                    await planningRepository_1.planningRepository.updateDataModel({
                        model: order_1.Order,
                        data: { status: "planning" },
                        options: { where: { orderId: planning.orderId }, transaction },
                    });
                }
                //3. tạo report theo số lần báo cáo
                await (0, reportHelper_1.createReportPlanning)({
                    planning: planning.toJSON(),
                    model: reportPlanningPaper_1.ReportPlanningPaper,
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
        }
        catch (error) {
            console.error("Error add Report Production:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmProducingPaper: async (req, planningId, user) => {
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
                const machineLabel = machineLabels_1.machineLabels[machine];
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
                const existingProducing = await planningRepository_1.planningRepository.getModelById({
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine, status: "producing" },
                    options: { transaction, lock: transaction?.LOCK.UPDATE },
                });
                if (existingProducing && existingProducing.planningId !== planningId) {
                    await planningRepository_1.planningRepository.updateDataModel({
                        model: existingProducing,
                        data: { status: "planning" },
                        options: { transaction },
                    });
                }
                await planningRepository_1.planningRepository.updateDataModel({
                    model: planning,
                    data: { status: "producing" },
                    options: { transaction },
                });
                return { message: "Confirm producing paper successfully", data: planning };
            });
            // --- GỬI SOCKET SAU KHI TRANSACTION THÀNH CÔNG ---
            if (result.data) {
                await planningPaperService_1.planningPaperService.notifyUpdatePlanning(req, false, result.data.chooseMachine, "planningPaperUpdated");
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
    //====================================BOX========================================
    getPlanningBox: async (machine) => {
        try {
            const cacheKey = box.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningBox_1.PlanningBox },
                { model: planningBoxMachineTime_1.PlanningBoxTime },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningBoxId: { [sequelize_1.Op.ne]: null } } },
            ], "manufactureBox");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("manufactureBox");
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data manufacture box from Redis");
                    return {
                        message: `get filtered cached planning:box:machine:${machine}`,
                        data: JSON.parse(cachedData),
                    };
                }
            }
            const planning = await manufactureRepository_1.manufactureRepository.getManufactureBox(machine);
            //lọc đơn complete trong 1 ngày
            const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const now = truncateToDate(new Date());
            const validData = planning.filter((planning) => {
                const boxTimes = planning.boxTimes || [];
                const hasValidStatus = boxTimes.some((bt) => ["planning", "lackOfQty", "producing"].includes(bt.status));
                const hasRecentComplete = boxTimes.some((bt) => {
                    if (bt.status !== "complete" || !bt.dayCompleted)
                        return false;
                    const dayCompleted = bt.dayCompleted ? new Date(bt.dayCompleted) : null;
                    if (!dayCompleted || isNaN(dayCompleted.getTime()))
                        return false;
                    const expiredDate = truncateToDate(dayCompleted);
                    expiredDate.setDate(expiredDate.getDate() + 1);
                    return expiredDate >= now;
                });
                return hasValidStatus || hasRecentComplete;
            });
            const allPlannings = [];
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
            await redisCache_1.default.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);
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
        const { qtyProduced, rpWasteLoss, dayCompleted, shiftManagement } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !shiftManagement) {
                    throw appError_1.AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
                }
                // 1. Tìm kế hoạch hiện tại
                const planning = await manufactureRepository_1.manufactureRepository.getBoxById(planningBoxId, machine, transaction);
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                // 2. Cộng dồn số lượng mới vào số đã có
                const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
                const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);
                const mergedShift = (0, planningHelper_1.mergeShiftField)(planning.shiftManagement ?? "", shiftManagement);
                const isCompletedOrder = newQtyProduced >= (planning.runningPlan || 0);
                const overflow = await planningRepository_1.planningRepository.getModelById({
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
                    await planningRepository_1.planningRepository.updateDataModel({
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
                    await planningRepository_1.planningRepository.updateDataModel({
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
                    await planningRepository_1.planningRepository.updateDataModel({
                        model: planning,
                        data: { status: "lackOfQty" },
                        options: { transaction },
                    });
                }
                // 3. tạo report theo số lần báo cáo
                await (0, reportHelper_1.createReportPlanning)({
                    planning: planning.toJSON(),
                    model: reportPlanningBox_1.ReportPlanningBox,
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
        }
        catch (error) {
            console.error("Error add Report Production:", error);
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
                const planning = await planningRepository_1.planningRepository.getModelById({
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
                    throw appError_1.AppError.Unauthorized("Planning already completed", "PLANNING_HAS_COMPLETED");
                }
                // Reset những thằng đang "producing"
                await manufactureRepository_1.manufactureRepository.updatePlanningBoxTime(planningBoxId, machine, transaction);
                // Update sang producing
                await planningRepository_1.planningRepository.updateDataModel({
                    model: planning,
                    data: { status: "producing" },
                    options: { transaction },
                });
                return { message: "Confirm producing box successfully", data: planning };
            });
            // --- GỬI SOCKET SAU KHI TRANSACTION THÀNH CÔNG ---
            if (result.data) {
                await planningPaperService_1.planningPaperService.notifyUpdatePlanning(req, false, result.data.machine, "planningBoxUpdated");
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
                const planningBox = await planningBox_1.PlanningBox.findByPk(planningBoxId, {
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            where: { machine, dayStart: { [sequelize_1.Op.ne]: null } },
                            as: "boxTimes",
                            attributes: ["boxTimeId", "qtyProduced", "machine", "isRequest"],
                        },
                    ],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!planningBox) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                if (planningBox.statusRequest == "requested") {
                    throw appError_1.AppError.BadRequest("Đơn này đã yêu cầu kiểm tra rồi", "PLANNING_ALREADY_REQUESTED");
                }
                const steps = await manufactureRepository_1.manufactureRepository.getAllBoxTimeById(planningBoxId, transaction);
                //check qty produced
                const checkQtyProduced = steps.some((step) => step.qtyProduced == null || step.qtyProduced <= 0);
                console.log(checkQtyProduced);
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
};
//# sourceMappingURL=manufactureService.js.map