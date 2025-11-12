"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmProducingBox = exports.addReportBox = exports.getPlanningBox = exports.confirmProducingPaper = exports.addReportPaper = exports.getPlanningPaper = void 0;
const sequelize_1 = require("sequelize");
const machineLabels_1 = require("../../../configs/machineLabels");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../../models/planning/timeOverflowPlanning");
const customer_1 = require("../../../models/customer/customer");
const box_1 = require("../../../models/order/box");
const order_1 = require("../../../models/order/order");
const planningBox_1 = require("../../../models/planning/planningBox");
const reportPlanningPaper_1 = require("../../../models/report/reportPlanningPaper");
const reportPlanningBox_1 = require("../../../models/report/reportPlanningBox");
const reportHelper_1 = require("../../../utils/helper/modelHelper/reportHelper");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const planningBoxMachineTime_1 = require("../../../models/planning/planningBoxMachineTime");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//===============================MANUFACTURE PAPER=====================================
//get planning machine paper
const getPlanningPaper = async (req, res) => {
    const { machine } = req.query;
    if (!machine) {
        return res.status(400).json({ message: "Missing machine query parameter" });
    }
    const { paper } = cacheManager_1.CacheManager.keys.manufacture;
    const cacheKey = paper.machine(machine);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check([
            { model: planningPaper_1.PlanningPaper },
            { model: planningBoxMachineTime_1.PlanningBoxTime },
            { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
        ], "manufacturePaper");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearManufacturePaper();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data manufacture paper from Redis");
                return res.json({
                    message: `get filtered cache planning:machine:${machine}`,
                    data: JSON.parse(cachedData),
                });
            }
        }
        const planning = await planningPaper_1.PlanningPaper.findAll({
            where: { chooseMachine: machine, dayStart: { [sequelize_1.Op.ne]: null } },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: {
                        exclude: [
                            "acreage",
                            "dvt",
                            "price",
                            "pricePaper",
                            "discount",
                            "profit",
                            "vat",
                            "rejectReason",
                            "createdAt",
                            "updatedAt",
                            "lengthPaperCustomer",
                            "paperSizeCustomer",
                            "quantityCustomer",
                        ],
                    },
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                },
            ],
            order: [["sortPlanning", "ASC"]],
        });
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
        res.status(200).json({
            message: `get planning paper by machine: ${machine}`,
            data: allPlannings,
        });
    }
    catch (error) {
        console.error("error", error.message);
        res.status(500).json({ message: "Server error", error: error });
    }
};
exports.getPlanningPaper = getPlanningPaper;
//create report for machine
const addReportPaper = async (req, res) => {
    const { planningId } = req.query;
    const { qtyProduced, qtyWasteNorm, dayCompleted, ...otherData } = req.body;
    const { role, permissions: userPermissions } = req.user;
    const planing_id = Number(planningId);
    if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const transaction = await planningPaper_1.PlanningPaper.sequelize?.transaction();
    try {
        // 1. Tìm kế hoạch hiện tại
        const planning = await planningPaper_1.PlanningPaper.findOne({
            where: { planningId: planing_id },
            include: [
                { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                { model: order_1.Order, attributes: ["quantityCustomer"] },
            ],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
        if (!planning) {
            await transaction?.rollback();
            return res.status(404).json({ message: "Planning not found" });
        }
        const machine = planning.chooseMachine;
        const machineLabel = machineLabels_1.machineLabels[machine];
        //check permission for machine
        if (role !== "admin" && role !== "manager") {
            if (!userPermissions.includes(machineLabel)) {
                await transaction?.rollback();
                return res.status(403).json({
                    message: `Access denied: You don't have permission to report for machine ${machine}`,
                });
            }
        }
        // 2. Cộng dồn số lượng mới vào số đã có
        const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
        const newQtyWasteNorm = Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);
        //cập nhật lại runningPlan cho planningPaper
        const newRunningPlan = Math.max(planning.runningPlan - Number(qtyProduced || 0), 0);
        const isOverflowReport = planning.hasOverFlow &&
            planning.timeOverFlow &&
            new Date(dayCompleted) >= new Date(planning.timeOverFlow?.overflowDayStart ?? "");
        let overflow, dayReportValue;
        //get timeOverflowPlanning
        if (planning.hasOverFlow) {
            overflow = await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
                where: { planningId: planing_id },
                transaction,
                lock: transaction?.LOCK.UPDATE,
            });
            if (!overflow) {
                await transaction?.rollback();
                return res.status(404).json({ message: "Overflow plan not found" });
            }
        }
        dayReportValue = new Date(dayCompleted);
        if (isOverflowReport) {
            await overflow?.update({ overflowDayCompleted: dayReportValue }, { transaction });
        }
        let updatedShiftProduction = planning.shiftProduction || "";
        let updatedShiftManagement = planning.shiftManagement || "";
        // nối thêm nếu có giá trị mới
        if (otherData.shiftProduction) {
            const newShift = otherData.shiftProduction.trim();
            if (!updatedShiftProduction
                .split(",")
                .map((s) => s.trim())
                .includes(newShift)) {
                updatedShiftProduction = updatedShiftProduction
                    ? `${updatedShiftProduction}, ${newShift}`
                    : newShift;
            }
        }
        if (otherData.shiftManagement) {
            const newManager = otherData.shiftManagement.trim();
            if (!updatedShiftManagement
                .split(",")
                .map((s) => s.trim())
                .includes(newManager)) {
                updatedShiftManagement = updatedShiftManagement
                    ? `${updatedShiftManagement}, ${newManager}`
                    : newManager;
            }
        }
        // 4) Update planning MỘT LẦN
        await planning.update({
            qtyProduced: newQtyProduced,
            qtyWasteNorm: newQtyWasteNorm,
            runningPlan: newRunningPlan,
            status: newRunningPlan <= 0 ? "complete" : "lackQty",
            dayCompleted: isOverflowReport ? planning.dayCompleted : dayReportValue,
            shiftProduction: updatedShiftProduction,
            shiftManagement: updatedShiftManagement,
        }, { transaction });
        if (newRunningPlan <= 0 && planning.hasOverFlow && overflow) {
            await overflow.update({ status: "complete" }, { transaction });
        }
        //update qty for planning box
        if (planning.hasBox) {
            const planningBox = await planningBox_1.PlanningBox.findOne({
                where: { orderId: planning.orderId },
                transaction,
                lock: transaction?.LOCK.UPDATE,
            });
            if (!planningBox) {
                return res.status(404).json({ message: "PlanningBox not found" });
            }
            await planningBox.update({ qtyPaper: newQtyProduced }, { transaction });
        }
        //check qty to change status order
        const allPlans = await planningPaper_1.PlanningPaper.findAll({
            where: { orderId: planning.orderId },
            attributes: ["qtyProduced"],
            transaction,
        });
        const totalQtyProduced = allPlans.reduce((sum, p) => sum + Number(p.qtyProduced || 0), 0);
        const qtyManufacture = planning.Order?.quantityCustomer || 0;
        if (totalQtyProduced >= qtyManufacture) {
            await order_1.Order.update({ status: "planning" }, { where: { orderId: planning.orderId }, transaction });
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
        res.status(200).json({
            message: "Add Report Production successfully",
            data: {
                planningId,
                qtyProduced: newQtyProduced,
                qtyWasteNorm: newQtyWasteNorm,
                dayCompleted,
                ...otherData,
            },
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("Error add Report Production:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addReportPaper = addReportPaper;
//confirm producing paper
const confirmProducingPaper = async (req, res) => {
    const { planningId } = req.query;
    const { role, permissions: userPermissions } = req.user;
    if (!planningId) {
        return res.status(400).json({ message: "Missing planningId query parameter" });
    }
    const planing_id = Number(planningId);
    const transaction = await planningPaper_1.PlanningPaper.sequelize?.transaction();
    try {
        const planning = await planningPaper_1.PlanningPaper.findOne({
            where: { planningId: planing_id },
            transaction,
            lock: transaction?.LOCK.UPDATE, // lock để tránh race condition
        });
        if (!planning) {
            return res.status(404).json({ message: "Planning not found" });
        }
        // check permission
        const machine = planning.chooseMachine;
        const machineLabel = machineLabels_1.machineLabels[machine];
        if (role !== "admin" && role !== "manager") {
            if (!userPermissions.includes(machineLabel)) {
                await transaction?.rollback();
                return res.status(403).json({
                    message: `Access denied: You don't have permission to report for machine ${machine}`,
                });
            }
        }
        // Check if the planning is already completed
        if (planning.status === "complete") {
            return res.status(400).json({ message: "Planning already completed" });
        }
        // Check if there's another planning in 'producing' status for the same machine
        const existingProducing = await planningPaper_1.PlanningPaper.findOne({
            where: { chooseMachine: machine, status: "producing" },
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
        if (existingProducing && existingProducing.planningId !== planing_id) {
            await existingProducing.update({ status: "planning" }, { transaction });
        }
        await planning.update({ status: "producing" }, { transaction });
        //clear cache
        await transaction?.commit();
        res.status(200).json({
            message: "Confirm producing paper successfully",
            data: planning,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("Error confirming producing paper:", error.message);
        res.status(400).json({ message: "Server error" });
    }
};
exports.confirmProducingPaper = confirmProducingPaper;
//===============================MANUFACTURE BOX=====================================
//get all planning box
const getPlanningBox = async (req, res) => {
    const { machine } = req.query;
    if (!machine) {
        return res.status(400).json({ message: "Missing 'machine' query parameter" });
    }
    const { box } = cacheManager_1.CacheManager.keys.manufacture;
    const cacheKey = box.machine(machine);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check([
            { model: planningBox_1.PlanningBox },
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
                return res.json({
                    message: `get filtered cached planning:box:machine:${machine}`,
                    data: JSON.parse(cachedData),
                });
            }
        }
        const planning = await planningBox_1.PlanningBox.findAll({
            attributes: {
                exclude: [
                    "hasIn",
                    "hasBe",
                    "hasXa",
                    "hasDan",
                    "hasCanLan",
                    "hasCatKhe",
                    "hasCanMang",
                    "hasDongGhim",
                    "createdAt",
                    "updatedAt",
                ],
            },
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: { machine: machine, dayStart: { [sequelize_1.Op.ne]: null } },
                    as: "boxTimes",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "allBoxTimes",
                    where: {
                        machine: { [sequelize_1.Op.ne]: machine },
                    },
                    attributes: {
                        exclude: [
                            "timeRunning",
                            "dayStart",
                            "dayCompleted",
                            "wasteBox",
                            "shiftManagement",
                            "status",
                            "sortPlanning",
                            "rpWasteLoss",
                            "createdAt",
                            "updatedAt",
                        ],
                    },
                },
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    required: false,
                    where: { machine: machine },
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "numberChild",
                        "dateRequestShipping",
                        "customerId",
                        "productId",
                        "quantityCustomer",
                    ],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                },
            ],
            order: [[{ model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
        });
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
        return res.status(200).json({
            message: `get planning by machine: ${machine}`,
            data: allPlannings,
        });
    }
    catch (error) {
        console.error("error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getPlanningBox = getPlanningBox;
//create report for machine
const addReportBox = async (req, res) => {
    const { planningBoxId, machine } = req.query;
    const { qtyProduced, rpWasteLoss, dayCompleted, shiftManagement } = req.body;
    if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !shiftManagement) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const planningBox_id = Number(planningBoxId);
    const transaction = await planningBoxMachineTime_1.PlanningBoxTime.sequelize?.transaction();
    try {
        // 1. Tìm kế hoạch hiện tại
        const planning = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
            where: { planningBoxId: planningBox_id, machine: machine },
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    include: [
                        { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                        { model: order_1.Order, attributes: ["quantityCustomer"] },
                    ],
                },
            ],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
        if (!planning) {
            await transaction?.rollback();
            return res.status(404).json({ message: "Planning not found" });
        }
        // 2. Cộng dồn số lượng mới vào số đã có
        const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
        const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);
        const qtyCustomer = planning.PlanningBox?.Order?.quantityCustomer || 0;
        const newRunningPlan = Math.max(qtyCustomer - Number(newQtyProduced || 0), 0);
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
            overflow = await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
                where: { planningBoxId, machine },
                transaction,
                lock: transaction?.LOCK.UPDATE,
            });
            if (!overflow) {
                await transaction?.rollback();
                return res.status(404).json({ message: "Overflow plan not found" });
            }
        }
        if (isOverflowReport) {
            await overflow?.update({ overflowDayCompleted: new Date(dayCompleted) }, { transaction });
            await planning.update({
                qtyProduced: newQtyProduced,
                rpWasteLoss: newQtyWasteNorm,
                shiftManagement: shiftManagement,
                runningPlan: newRunningPlan,
            }, { transaction });
            dayReportValue = overflow?.getDataValue("overflowDayCompleted");
        }
        else {
            //Cập nhật kế hoạch với số liệu mới
            await planning.update({
                dayCompleted: new Date(dayCompleted),
                qtyProduced: newQtyProduced,
                rpWasteLoss: newQtyWasteNorm,
                shiftManagement: shiftManagement,
                runningPlan: newRunningPlan,
            }, { transaction });
            dayReportValue = planning.getDataValue("dayCompleted");
        }
        //condition to complete
        if (newRunningPlan <= 0) {
            await planning.update({ status: "complete" }, { transaction });
            if (isOverflowReport) {
                await overflow?.update({ status: "complete" }, { transaction });
            }
        }
        else {
            await planning.update({ status: "lackOfQty" }, { transaction });
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
        res.status(200).json({
            message: "Add Report Production successfully",
            data: {
                planningBoxId,
                machine,
                qtyProduced: newQtyProduced,
                qtyWasteNorm: newQtyWasteNorm,
                dayCompleted,
                shiftManagement,
                status: newQtyProduced >= qtyCustomer ? "complete" : "lackQty",
            },
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("Error add Report Production:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addReportBox = addReportBox;
//confirm producing box
const confirmProducingBox = async (req, res) => {
    const { planningBoxId, machine } = req.query;
    const { role, permissions: userPermissions } = req.user;
    if (!planningBoxId) {
        return res.status(400).json({ message: "Missing planningBoxId query parameter" });
    }
    const planningBox_id = Number(planningBoxId);
    const transaction = await planningBox_1.PlanningBox.sequelize?.transaction();
    try {
        // Lấy planning cần update
        const planning = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
            where: { planningBoxId: planningBox_id, machine },
            transaction,
            lock: transaction?.LOCK.UPDATE,
            skipLocked: true,
        });
        if (!planning) {
            await transaction?.rollback();
            return res.status(404).json({ message: "Planning not found" });
        }
        // check permission
        const machineLabel = machineLabels_1.machineLabels[machine] ?? null;
        if (!machineLabel) {
            return res.status(400).json({ message: `Invalid machine: ${machine}` });
        }
        if (role !== "admin" && role !== "manager") {
            if (!userPermissions.includes(machineLabel)) {
                await transaction?.rollback();
                return res.status(403).json({
                    message: `Access denied: You don't have permission to report for machine ${machine}`,
                });
            }
        }
        // Check if already complete
        if (planning.status === "complete") {
            await transaction?.rollback();
            return res.status(400).json({ message: "Planning already completed" });
        }
        // Reset những thằng đang "producing"
        await planningBoxMachineTime_1.PlanningBoxTime.update({ status: "planning" }, {
            where: {
                machine,
                status: "producing",
                planningBoxId: { [sequelize_1.Op.ne]: planningBox_id },
            },
            transaction,
        });
        // Update sang producing
        await planning.update({ status: "producing" }, { transaction });
        await transaction?.commit();
        return res.status(200).json({
            message: "Confirm producing box successfully",
            data: planning,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("Error confirming producing box:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.confirmProducingBox = confirmProducingBox;
//# sourceMappingURL=manufactureController.js.map