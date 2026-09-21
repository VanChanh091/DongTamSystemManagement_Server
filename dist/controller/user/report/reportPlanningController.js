"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelReportBox = exports.exportExcelReportPaper = exports.getReportQcInspectionSummary = exports.getReportBoxes = exports.getReportPapers = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const reportService_1 = require("../../../service/reportService");
const qcInspectionCheckService_1 = require("../../../service/qualityControl/qcInspectionCheckService");
//===============================REPORT PAPER & PAPER=====================================
const getReportPapers = async (req, res, next) => {
    const { field, keyword, machine, page = 1, pageSize = 20, startDate, endDate, } = req.query;
    try {
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword && machine) {
            response = await reportService_1.reportService.getReportPaperByField({
                field,
                keyword,
                machine,
                page: Number(page),
                pageSize: Number(pageSize),
                startDate,
                endDate,
            });
        }
        // 2. Nhánh lấy tất cả
        else {
            response = await reportService_1.reportService.getReportPaper(machine, Number(page), Number(pageSize));
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getReportPapers = getReportPapers;
const getReportBoxes = async (req, res, next) => {
    const { field, keyword, machine, page = 1, pageSize = 20, startDate, endDate, } = req.query;
    try {
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword && machine) {
            response = await reportService_1.reportService.getReportBoxByField({
                field,
                keyword,
                machine,
                page: Number(page),
                pageSize: Number(pageSize),
                startDate,
                endDate,
            });
        }
        // 2. Nhánh lấy tất cả
        else {
            response = await reportService_1.reportService.getReportBox(machine, Number(page), Number(pageSize));
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getReportBoxes = getReportBoxes;
//===============================REPORT INSPECTION=====================================
const getReportQcInspectionSummary = async (req, res, next) => {
    const { machine, startDate, endDate, isPaper } = req.query;
    try {
        let response;
        response = await qcInspectionCheckService_1.qcInspectionService.getReportQcInspectionSummary({
            machine,
            startDate,
            endDate,
            isPaper,
            user: req.user,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getReportQcInspectionSummary = getReportQcInspectionSummary;
//===============================EXPORT EXCEL=====================================
const exportExcelReportPaper = async (req, res, next) => {
    const { fromDate, toDate, machine } = req.body;
    try {
        const response = await reportService_1.reportService.exportReportPaper({
            res,
            fromDate,
            toDate,
            userName: req.user.email,
            machine,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelReportPaper = exportExcelReportPaper;
const exportExcelReportBox = async (req, res, next) => {
    const { fromDate, toDate, machine } = req.body;
    try {
        const response = await reportService_1.reportService.exportReportBox(res, fromDate, toDate, req.user.email, machine);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelReportBox = exportExcelReportBox;
//# sourceMappingURL=reportPlanningController.js.map