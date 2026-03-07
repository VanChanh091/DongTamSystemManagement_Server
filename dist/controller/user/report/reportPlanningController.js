"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelReportBox = exports.exportExcelReportPaper = exports.getReportBoxes = exports.getReportPapers = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const reportService_1 = require("../../../service/reportService");
//===============================REPORT PAPER=====================================
const getReportPapers = async (req, res, next) => {
    const { field, keyword, machine, page = 1, pageSize = 20, } = req.query;
    try {
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword && machine) {
            response = await reportService_1.reportService.getReportPaperByField(field, keyword, machine, Number(page), Number(pageSize));
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
//===============================REPORT BOX=====================================
const getReportBoxes = async (req, res, next) => {
    const { field, keyword, machine, page = 1, pageSize = 20, } = req.query;
    try {
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword && machine) {
            response = await reportService_1.reportService.getReportBoxByField(field, keyword, machine, Number(page), Number(pageSize));
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
//===============================EXPORT EXCEL=====================================
//export excel paper
const exportExcelReportPaper = async (req, res, next) => {
    const { fromDate, toDate, reportPaperId, machine } = req.body;
    try {
        const response = await reportService_1.reportService.exportReportPaper(res, fromDate, toDate, reportPaperId, machine);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelReportPaper = exportExcelReportPaper;
//export excel box
const exportExcelReportBox = async (req, res, next) => {
    const { fromDate, toDate, reportBoxId, machine } = req.body;
    try {
        const response = await reportService_1.reportService.exportReportBox(res, fromDate, toDate, reportBoxId, machine);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelReportBox = exportExcelReportBox;
//# sourceMappingURL=reportPlanningController.js.map