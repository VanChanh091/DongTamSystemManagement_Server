"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReportPlanning = exports.filterReportByField = void 0;
const reportPlanningPaper_1 = require("../../../models/report/reportPlanningPaper");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const order_1 = require("../../../models/order/order");
const customer_1 = require("../../../models/customer/customer");
const box_1 = require("../../../models/order/box");
const reportPlanningBox_1 = require("../../../models/report/reportPlanningBox");
const planningBox_1 = require("../../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../../models/planning/planningBoxMachineTime");
const sequelize_1 = require("sequelize");
const cacheManager_1 = require("../cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const normalizeVN_1 = require("../normalizeVN");
const filterReportByField = async ({ keyword, machine, getFieldValue, page, pageSize, message, isBox = false, }) => {
    const currentPage = Number(page) || 1;
    const currentPageSize = Number(pageSize) || 20;
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    const { paper, box } = cacheManager_1.CacheManager.keys.report;
    const cacheKey = isBox ? box.search : paper.search;
    try {
        let allReports = await redisCache_1.default.get(cacheKey);
        let sourceMessage = "";
        if (!allReports) {
            allReports = await findAllReportBox({ isBox, machine });
            await redisCache_1.default.set(cacheKey, JSON.stringify(allReports), "EX", 900);
            sourceMessage = "Get reports from DB";
        }
        else {
            allReports = JSON.parse(allReports);
            sourceMessage = message;
        }
        // Lọc dữ liệu
        const filteredReports = allReports.filter((report) => {
            const fieldValue = getFieldValue(report);
            return fieldValue != null
                ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
                : false;
        });
        // Phân trang
        const totalReports = filteredReports.length;
        const totalPages = Math.ceil(totalReports / currentPageSize);
        const offset = (currentPage - 1) * currentPageSize;
        const paginatedReports = filteredReports.slice(offset, offset + currentPageSize);
        return {
            message: sourceMessage,
            data: paginatedReports,
            totalReports,
            totalPages,
            currentPage,
        };
    }
    catch (error) {
        console.error(error);
        throw new Error("Lỗi server");
    }
};
exports.filterReportByField = filterReportByField;
const findAllReportBox = async ({ isBox, machine }) => {
    try {
        let data;
        if (isBox) {
            data = await reportPlanningBox_1.ReportPlanningBox.findAll({
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
        }
        else {
            data = await reportPlanningPaper_1.ReportPlanningPaper.findAll({
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
            });
        }
        return data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Không lấy được data");
    }
};
const createReportPlanning = async ({ planning, model, qtyProduced, qtyWasteNorm, dayReportValue, shiftManagementBox = "", machine = "", otherData, transaction, isBox = false, }) => {
    //condition to get id
    const whereCondition = isBox
        ? {
            planningBoxId: planning.PlanningBox.planningBoxId,
            machine: machine,
        }
        : {
            planningId: planning.planningId,
        };
    //total qtyProduced
    const producedSoFar = (await model.sum("qtyProduced", {
        where: whereCondition,
        transaction,
    })) || 0;
    // Cộng thêm sản lượng lần này
    const totalProduced = producedSoFar + Number(qtyProduced || 0);
    // Tính số lượng còn thiếu
    let lackOfQtyValue = isBox
        ? planning.PlanningBox.Order.quantityCustomer - totalProduced
        : planning.Order.quantityCustomer - totalProduced;
    let report;
    if (isBox) {
        //box
        report = await model.create({
            planningBoxId: planning.PlanningBox.planningBoxId,
            dayReport: dayReportValue,
            qtyProduced: qtyProduced,
            lackOfQty: lackOfQtyValue,
            wasteLoss: qtyWasteNorm,
            shiftManagement: shiftManagementBox,
            machine: machine,
        }, { transaction });
    }
    else {
        // paper
        report = await model.create({
            planningId: planning.planningId,
            dayReport: dayReportValue,
            qtyProduced: qtyProduced,
            lackOfQty: lackOfQtyValue,
            qtyWasteNorm: qtyWasteNorm,
            shiftProduction: otherData.shiftProduction,
            shiftManagement: otherData.shiftManagement,
        }, { transaction });
    }
    return {
        report,
        producedSoFar,
        totalProduced,
        lackOfQtyValue,
    };
};
exports.createReportPlanning = createReportPlanning;
//# sourceMappingURL=reportHelper.js.map