"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelReportBox = exports.exportExcelReportPaper = exports.getReportedBoxByField = exports.getReportPlanningBox = exports.getReportedPaperByField = exports.getReportPlanningPaper = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../../models/order/order");
const box_1 = require("../../../models/order/box");
const customer_1 = require("../../../models/customer/customer");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const reportPlanningPaper_1 = require("../../../models/report/reportPlanningPaper");
const planningBoxMachineTime_1 = require("../../../models/planning/planningBoxMachineTime");
const planningBox_1 = require("../../../models/planning/planningBox");
const reportPlanningBox_1 = require("../../../models/report/reportPlanningBox");
const reportHelper_1 = require("../../../utils/helper/modelHelper/reportHelper");
const reportPaperRowAndColumn_1 = require("../../../utils/mapping/reportPaperRowAndColumn");
const reportBoxRowAndColumn_1 = require("../../../utils/mapping/reportBoxRowAndColumn");
const excelExporter_1 = require("../../../utils/helper/excelExporter");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//===============================REPORT PAPER=====================================
//get all report planning paper
const getReportPlanningPaper = async (req, res) => {
    const { machine, page = 1, pageSize = 20 } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    if (!machine) {
        return res.status(400).json({ message: "Missing 'machine' query parameter" });
    }
    const { paper } = cacheManager_1.CacheManager.keys.report;
    const cacheKey = paper.all(currentPage);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check(reportPlanningPaper_1.ReportPlanningPaper, "reportPaper");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearReportPaper();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data Report Planning Paper from Redis");
                const parsed = JSON.parse(cachedData);
                return res
                    .status(200)
                    .json({ ...parsed, message: "Get all report planning paper from cache" });
            }
        }
        const totalOrders = await reportPlanningPaper_1.ReportPlanningPaper.count();
        const totalPages = Math.ceil(totalOrders / currentPageSize);
        const offset = (currentPage - 1) * currentPageSize;
        const data = await reportPlanningPaper_1.ReportPlanningPaper.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine },
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "dayCompleted",
                            "shiftProduction",
                            "shiftProduction",
                            "shiftManagement",
                            "status",
                            "hasOverFlow",
                            "sortPlanning",
                        ],
                    },
                    include: [
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
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
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
                },
            ],
            offset,
            limit: currentPageSize,
            order: [["dayReport", "DESC"]],
        });
        const responseData = {
            message: "get all report planning paper successfully",
            data,
            totalOrders,
            totalPages,
            currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("get all reportPaper failed:", error.message);
        res.status(500).json({ message: "get all reportPaper failed", error });
    }
};
exports.getReportPlanningPaper = getReportPlanningPaper;
//get reported paper by field
const getReportedPaperByField = async (req, res) => {
    const { field, keyword, machine, page = 1, pageSize = 20, } = req.query;
    const fieldMap = {
        customerName: (report) => report?.Planning?.Order?.Customer?.customerName,
        dayReported: (report) => report?.dayReport,
        qtyProduced: (report) => report?.qtyProduced,
        ghepKho: (report) => report?.Planning?.ghepKho,
        shiftManagement: (report) => report?.shiftManagement,
        orderId: (report) => report?.Planning?.Order?.orderId,
    };
    const key = field;
    if (!fieldMap[key]) {
        return res.status(400).json({ message: "Invalid field parameter" });
    }
    try {
        const result = await (0, reportHelper_1.filterReportByField)({
            keyword: keyword,
            machine,
            getFieldValue: fieldMap[key],
            page,
            pageSize,
            message: `get all by ${field} from filtered cache`,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error(`Failed to get report paper by ${field}:`, error.message);
        return res.status(500).json({ message: "Server error", error: error });
    }
};
exports.getReportedPaperByField = getReportedPaperByField;
//===============================REPORT BOX=====================================
//get all report planning box
const getReportPlanningBox = async (req, res) => {
    const { machine, page = 1, pageSize = 20, } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    if (!machine) {
        return res.status(400).json({ message: "Missing 'machine' query parameter" });
    }
    const { box } = cacheManager_1.CacheManager.keys.report;
    const cacheKey = box.all(currentPage);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check(reportPlanningBox_1.ReportPlanningBox, "reportBox");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearReportBox();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data Report Planning Box from Redis");
                const parsed = JSON.parse(cachedData);
                return res
                    .status(200)
                    .json({ ...parsed, message: "Get all report planning box from cache" });
            }
        }
        const totalOrders = await reportPlanningBox_1.ReportPlanningBox.count();
        const totalPages = Math.ceil(totalOrders / currentPageSize);
        const offset = (currentPage - 1) * currentPageSize;
        const data = await reportPlanningBox_1.ReportPlanningBox.findAll({
            where: { machine: machine },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningBox_1.PlanningBox,
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
                            where: { machine: machine }, //tìm machine thỏa điều kiện
                            as: "boxTimes",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "allBoxTimes",
                            where: {
                                machine: { [sequelize_1.Op.ne]: machine }, //lọc machine ra khỏi danh sách
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
                                    "createdAt",
                                    "updatedAt",
                                    "rpWasteLoss",
                                ],
                            },
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
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
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
                },
            ],
            offset,
            limit: currentPageSize,
            order: [["dayReport", "DESC"]],
        });
        const responseData = {
            message: "get all report planning paper successfully",
            data,
            totalOrders,
            totalPages,
            currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("get all reportBox failed:", error.message);
        res.status(500).json({ message: "get all reportBox failed", error });
    }
};
exports.getReportPlanningBox = getReportPlanningBox;
//get reported box by field
const getReportedBoxByField = async (req, res) => {
    const { field, keyword, machine, page = 1, pageSize = 20, } = req.query;
    const fieldMap = {
        customerName: (report) => report?.PlanningBox?.Order?.Customer?.customerName,
        dayReported: (report) => report?.dayReport,
        qtyProduced: (report) => report?.qtyProduced,
        QcBox: (report) => report?.PlanningBox?.Order?.QC_box,
        shiftManagement: (report) => report?.shiftManagement,
        orderId: (report) => report?.PlanningBox?.Order?.orderId,
    };
    const key = field;
    if (!fieldMap[key]) {
        return res.status(400).json({ message: "Invalid field parameter" });
    }
    try {
        const result = await (0, reportHelper_1.filterReportByField)({
            keyword: keyword,
            machine,
            getFieldValue: fieldMap[key],
            page,
            pageSize,
            message: `get all by ${field} from filtered cache`,
            isBox: true,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error(`Failed to get report paper by ${field}:`, error.message);
        return res.status(500).json({ message: "Server error", error: error });
    }
};
exports.getReportedBoxByField = getReportedBoxByField;
//===============================EXPORT EXCEL=====================================
//export excel paper
const exportExcelReportPaper = async (req, res) => {
    const { fromDate, toDate, reportPaperId, machine } = req.body;
    try {
        let whereCondition = {};
        if (reportPaperId && reportPaperId.length > 0) {
            whereCondition.reportPaperId = reportPaperId;
        }
        else if (fromDate && toDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            whereCondition.dayReport = { [sequelize_1.Op.between]: [start, end] };
        }
        const data = await reportPlanningPaper_1.ReportPlanningPaper.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine },
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "dayCompleted",
                            "shiftProduction",
                            "shiftProduction",
                            "shiftManagement",
                            "status",
                            "hasOverFlow",
                            "sortPlanning",
                        ],
                    },
                    include: [
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
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
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
                },
            ],
            order: [["dayReport", "ASC"]],
        });
        await (0, excelExporter_1.exportExcelResponse)(res, {
            data: data,
            sheetName: "Báo cáo sản xuất giấy tấm",
            fileName: `report_paper_${machine}`,
            columns: reportPaperRowAndColumn_1.reportPaperColumns,
            rows: reportPaperRowAndColumn_1.mapReportPaperRow,
        });
    }
    catch (error) {
        console.error("Export Excel error:", error.message);
        res.status(500).json({ message: "Lỗi xuất Excel" });
    }
};
exports.exportExcelReportPaper = exportExcelReportPaper;
//export excel box
const exportExcelReportBox = async (req, res) => {
    const { fromDate, toDate, reportBoxId, machine } = req.body;
    try {
        let whereCondition = {};
        if (reportBoxId && reportBoxId.length > 0) {
            whereCondition.reportBoxId = reportBoxId;
        }
        else if (fromDate && toDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            whereCondition.dayReport = { [sequelize_1.Op.between]: [start, end] };
        }
        const data = await reportPlanningBox_1.ReportPlanningBox.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningBox_1.PlanningBox,
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
                            where: { machine: machine },
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
                                    "createdAt",
                                    "updatedAt",
                                    "rpWasteLoss",
                                ],
                            },
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
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
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
                },
            ],
        });
        await (0, excelExporter_1.exportExcelResponse)(res, {
            data: data,
            sheetName: "Báo cáo sản xuất thùng",
            fileName: `report_box_${machine}`,
            columns: reportBoxRowAndColumn_1.reportBoxColumns,
            rows: reportBoxRowAndColumn_1.mapReportBoxRow,
        });
    }
    catch (error) {
        console.error("Export Excel error:", error.message);
        res.status(500).json({ message: "Lỗi xuất Excel" });
    }
};
exports.exportExcelReportBox = exportExcelReportBox;
//# sourceMappingURL=reportPlanningController.js.map