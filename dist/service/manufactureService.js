"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manufactureService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const cacheManager_1 = require("../utils/helper/cacheManager");
const appError_1 = require("../utils/appError");
const planningPaper_1 = require("../models/planning/planningPaper");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
const sequelize_1 = require("sequelize");
const redisCache_1 = __importDefault(require("../configs/redisCache"));
const manufactureRepository_1 = require("../repository/manufactureRepository");
const machineLabels_1 = require("../configs/machineLabels");
const planningRepository_1 = require("../repository/planningRepository");
const planningBox_1 = require("../models/planning/planningBox");
const order_1 = require("../models/order/order");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const reportHelper_1 = require("../utils/helper/modelHelper/reportHelper");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const planningHelper_1 = require("../utils/helper/modelHelper/planningHelper");
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = cacheManager_1.CacheManager.keys.manufacture;
const { box } = cacheManager_1.CacheManager.keys.manufacture;
exports.manufactureService = {
    //====================================PAPER========================================
    getPlanningPaper: async (machine) => {
        try {
            if (!machine) {
                throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
            }
            const cacheKey = paper.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "manufacturePaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearManufacturePaper();
                await cacheManager_1.CacheManager.clearOrderAccept();
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
        const transaction = await planningPaper_1.PlanningPaper.sequelize?.transaction();
        try {
            if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
                throw appError_1.AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
            }
            // 1. Tìm kế hoạch hiện tại
            const planning = await manufactureRepository_1.manufactureRepository.getPapersById(planningId, transaction);
            if (!planning) {
                await transaction?.rollback();
                throw appError_1.AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
            }
            const machine = planning.chooseMachine;
            const machineLabel = machineLabels_1.machineLabels[machine];
            //check permission for machine
            if (role !== "admin" && role !== "manager") {
                if (!userPermissions.includes(machineLabel)) {
                    await transaction?.rollback();
                    throw appError_1.AppError.Unauthorized(`Access denied: You don't have permission to report for machine ${machine}`, "UNAUTHORIZED_ACCESS");
                }
            }
            // 2. Cộng dồn số lượng mới vào số đã có
            const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
            const newQtyWasteNorm = Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);
            // update status dựa trên qtyProduced
            const isCompleted = newQtyProduced >= planning.runningPlan;
            const newStatus = isCompleted ? "complete" : "lackQty";
            const isOverflowReport = planning.hasOverFlow &&
                planning.timeOverFlow &&
                new Date(dayCompleted) >= new Date(planning.timeOverFlow?.overflowDayStart ?? "");
            let overflow, dayReportValue;
            //get timeOverflowPlanning
            if (planning.hasOverFlow) {
                overflow = await planningRepository_1.planningRepository.getModelById(timeOverflowPlanning_1.timeOverflowPlanning, { planningId }, { transaction, lock: transaction?.LOCK.UPDATE });
                if (!overflow) {
                    await transaction?.rollback();
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
            await planningRepository_1.planningRepository.updateDataModel(planning, {
                qtyProduced: newQtyProduced,
                qtyWasteNorm: newQtyWasteNorm,
                status: newStatus,
                dayCompleted: isOverflowReport ? planning.dayCompleted : dayReportValue,
                shiftProduction: updatedShiftProduction,
                shiftManagement: updatedShiftManagement,
            }, { transaction });
            if (isCompleted && planning.hasOverFlow && overflow) {
                planningRepository_1.planningRepository.updateDataModel(overflow, { status: "complete" }, { transaction });
            }
            //update qty for planning box
            if (planning.hasBox) {
                const planningBox = await planningRepository_1.planningRepository.getModelById(planningBox_1.PlanningBox, { orderId: planning.orderId }, { transaction, lock: transaction?.LOCK.UPDATE });
                if (!planningBox) {
                    throw appError_1.AppError.NotFound("PlanningBox not found", "PLANNING_BOX_NOT_FOUND");
                }
                await planningBox.update({ qtyPaper: newQtyProduced }, { transaction });
            }
            //check qty to change status order
            const allPlans = await manufactureRepository_1.manufactureRepository.getPapersByOrderId(planning.orderId, transaction);
            const totalQtyProduced = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
            const qtyManufacture = planning.Order?.quantityCustomer || 0;
            if (totalQtyProduced >= qtyManufacture) {
                await planningRepository_1.planningRepository.updateDataModel(order_1.Order, { status: "planning" }, { where: { orderId: planning.orderId }, transaction });
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
            //4. Commit + clear cache
            await transaction?.commit();
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
        }
        catch (error) {
            await transaction?.rollback();
            console.error("Error add Report Production:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmProducingPaper: async (planningId, user) => {
        const { role, permissions: userPermissions } = user;
        const transaction = await planningPaper_1.PlanningPaper.sequelize?.transaction();
        try {
            if (!planningId) {
                throw appError_1.AppError.BadRequest("Missing planningId parameter", "MISSING_PARAMETERS");
            }
            const planning = await planningPaper_1.PlanningPaper.findOne({
                where: { planningId },
                transaction,
                lock: transaction?.LOCK.UPDATE, // lock để tránh race condition
            });
            planningRepository_1.planningRepository.getModelById(planningPaper_1.PlanningPaper, { planningId }, {
                transaction,
                lock: transaction?.LOCK.UPDATE, // lock để tránh race condition
            });
            if (!planning) {
                throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
            }
            // check permission
            const machine = planning.chooseMachine;
            const machineLabel = machineLabels_1.machineLabels[machine];
            if (role !== "admin" && role !== "manager") {
                if (!userPermissions.includes(machineLabel)) {
                    await transaction?.rollback();
                    throw appError_1.AppError.Unauthorized(`Access denied: You don't have permission to report for machine ${machine}`, "ACCESS_DENIED");
                }
            }
            // Check if the planning is already completed
            if (planning.status === "complete") {
                throw appError_1.AppError.Conflict("Planning already completed", "PLANNING_COMPLETED");
            }
            // Check if there's another planning in 'producing' status for the same machine
            const existingProducing = await planningRepository_1.planningRepository.getModelById(planningPaper_1.PlanningPaper, { chooseMachine: machine, status: "producing" }, { transaction, lock: transaction?.LOCK.UPDATE });
            if (existingProducing && existingProducing.planningId !== planningId) {
                await planningRepository_1.planningRepository.updateDataModel(existingProducing, { status: "planning" }, { transaction });
            }
            await planningRepository_1.planningRepository.updateDataModel(planning, { status: "producing" }, { transaction });
            //clear cache
            await transaction?.commit();
            return {
                message: "Confirm producing paper successfully",
                data: planning,
            };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("Error confirming producing paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //====================================BOX========================================
    getPlanningBox: async (machine) => {
        try {
            if (!machine) {
                throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
            }
            const cacheKey = box.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningBox_1.PlanningBox },
                { model: planningBoxMachineTime_1.PlanningBoxTime },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningBoxId: { [sequelize_1.Op.ne]: null } } },
            ], "manufactureBox");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearManufactureBox();
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
        const transaction = await planningBoxMachineTime_1.PlanningBoxTime.sequelize?.transaction();
        try {
            if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !shiftManagement) {
                throw appError_1.AppError.BadRequest("Missing required fields", "MISSING_PARAMETERS");
            }
            // 1. Tìm kế hoạch hiện tại
            const planning = await manufactureRepository_1.manufactureRepository.getBoxById(planningBoxId, machine, transaction);
            if (!planning) {
                await transaction?.rollback();
                throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
            }
            // 2. Cộng dồn số lượng mới vào số đã có
            const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
            const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);
            const mergedShift = (0, planningHelper_1.mergeShiftField)(planning.shiftManagement ?? "", shiftManagement);
            const isCompletedOrder = newQtyProduced >= (planning.runningPlan || 0);
            const timeOverFlow = (Array.isArray(planning.PlanningBox.timeOverFlow) &&
                planning.PlanningBox.timeOverFlow.length > 0
                ? planning.PlanningBox.timeOverFlow[0]
                : planning.PlanningBox.timeOverFlow);
            //condition
            const isOverflowReport = planning.PlanningBox.hasOverFlow &&
                planning.PlanningBox.timeOverFlow &&
                timeOverFlow &&
                new Date(dayCompleted) >= new Date(timeOverFlow.overflowDayStart ?? "");
            let overflow, dayReportValue;
            //get timeOverflowPlanning
            if (planning.PlanningBox.hasOverFlow) {
                overflow = await planningRepository_1.planningRepository.getModelById(timeOverflowPlanning_1.timeOverflowPlanning, { planningBoxId, machine }, { transaction, lock: transaction?.LOCK.UPDATE });
                if (!overflow) {
                    await transaction?.rollback();
                    throw appError_1.AppError.NotFound("Overflow plan not found", "OVERFLOW_NOT_FOUND");
                }
            }
            if (isOverflowReport) {
                await overflow?.update({ overflowDayCompleted: new Date(dayCompleted) }, { transaction });
                await planningRepository_1.planningRepository.updateDataModel(planning, {
                    qtyProduced: newQtyProduced,
                    rpWasteLoss: newQtyWasteNorm,
                    shiftManagement: mergedShift,
                }, { transaction });
                dayReportValue = overflow?.getDataValue("overflowDayCompleted");
            }
            else {
                //Cập nhật kế hoạch với số liệu mới
                await planningRepository_1.planningRepository.updateDataModel(planning, {
                    dayCompleted: new Date(dayCompleted),
                    qtyProduced: newQtyProduced,
                    rpWasteLoss: newQtyWasteNorm,
                    shiftManagement: mergedShift,
                }, { transaction });
                dayReportValue = planning.getDataValue("dayCompleted");
            }
            //condition to complete
            if (isCompletedOrder) {
                await planningRepository_1.planningRepository.updateDataModel(planning, { status: "complete" }, { transaction });
                if (isOverflowReport) {
                    await overflow?.update({ status: "complete" }, { transaction });
                }
            }
            else {
                await planningRepository_1.planningRepository.updateDataModel(planning, { status: "lackOfQty" }, { transaction });
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
            // 4. Commit + clear cache
            await transaction?.commit();
            return {
                message: "Add Report Production successfully",
                data: {
                    planningBoxId,
                    machine,
                    qtyProduced: newQtyProduced,
                    qtyWasteNorm: newQtyWasteNorm,
                    dayCompleted,
                    shiftManagement,
                    status: isCompletedOrder ? "complete" : "lackQty",
                },
            };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("Error add Report Production:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmProducingBox: async (planningBoxId, machine, user) => {
        const { role, permissions: userPermissions } = user;
        const transaction = await planningBox_1.PlanningBox.sequelize?.transaction();
        try {
            if (!planningBoxId) {
                throw appError_1.AppError.BadRequest("Missing planningBoxId parameter", "MISSING_PARAMETERS");
            }
            // Lấy planning cần update
            const planning = await planningRepository_1.planningRepository.getModelById(planningBoxMachineTime_1.PlanningBoxTime, { planningBoxId, machine }, { transaction, lock: transaction?.LOCK.UPDATE, skipLocked: true });
            if (!planning) {
                await transaction?.rollback();
                throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
            }
            // check permission
            const machineLabel = machineLabels_1.machineLabels[machine] ?? null;
            if (!machineLabel) {
                throw appError_1.AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
            }
            if (role !== "admin" && role !== "manager") {
                if (!userPermissions.includes(machineLabel)) {
                    await transaction?.rollback();
                    throw appError_1.AppError.Unauthorized(`Access denied: You don't have permission to report for machine ${machine}`, "ACCESS_DENIED");
                }
            }
            // Check if already complete
            if (planning.status === "complete") {
                await transaction?.rollback();
                throw appError_1.AppError.Unauthorized("Planning already completed", "PLANNING_HAS_COMPLETED");
            }
            // Reset những thằng đang "producing"
            await manufactureRepository_1.manufactureRepository.updatePlanningBoxTime(planningBoxId, machine, transaction);
            // Update sang producing
            await planningRepository_1.planningRepository.updateDataModel(planning, { status: "producing" }, { transaction });
            await transaction?.commit();
            return { message: "Confirm producing box successfully", data: planning };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("Error confirming producing box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=manufactureService.js.map