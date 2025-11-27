"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelReportBox = exports.exportExcelReportPaper = exports.getReportedBoxByField = exports.getReportPlanningBox = exports.getReportedPaperByField = exports.getReportPlanningPaper = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const reportService_1 = require("../../../service/reportService");
//===============================REPORT PAPER=====================================
//get all report planning paper
const getReportPlanningPaper = async (req, res) => {
    const { machine, page = 1, pageSize = 20, } = req.query;
    try {
        const response = await reportService_1.reportService.getReportPaper(machine, Number(page), Number(pageSize));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getReportPlanningPaper = getReportPlanningPaper;
//get reported paper by field
const getReportedPaperByField = async (req, res) => {
    const { field, keyword, machine, page = 1, pageSize = 20, } = req.query;
    try {
        const response = await reportService_1.reportService.getReportPaperByField(field, keyword, machine, Number(page), Number(pageSize));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getReportedPaperByField = getReportedPaperByField;
//===============================REPORT BOX=====================================
//get all report planning box
const getReportPlanningBox = async (req, res) => {
    const { machine, page = 1, pageSize = 20, } = req.query;
    try {
        const response = await reportService_1.reportService.getReportBox(machine, Number(page), Number(pageSize));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getReportPlanningBox = getReportPlanningBox;
//get reported box by field
const getReportedBoxByField = async (req, res) => {
    const { field, keyword, machine, page = 1, pageSize = 20, } = req.query;
    try {
        const response = await reportService_1.reportService.getReportBoxByField(field, keyword, machine, Number(page), Number(pageSize));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getReportedBoxByField = getReportedBoxByField;
//===============================EXPORT EXCEL=====================================
//export excel paper
const exportExcelReportPaper = async (req, res) => {
    const { fromDate, toDate, reportPaperId, machine } = req.body;
    try {
        const response = await reportService_1.reportService.exportReportPaper(res, fromDate, toDate, reportPaperId, machine);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.exportExcelReportPaper = exportExcelReportPaper;
//export excel box
const exportExcelReportBox = async (req, res) => {
    const { fromDate, toDate, reportBoxId, machine } = req.body;
    try {
        const response = await reportService_1.reportService.exportReportBox(res, fromDate, toDate, reportBoxId, machine);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.exportExcelReportBox = exportExcelReportBox;
//# sourceMappingURL=reportPlanningController.js.map