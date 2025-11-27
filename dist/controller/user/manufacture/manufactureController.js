"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmProducingBox = exports.addReportBox = exports.getPlanningBox = exports.confirmProducingPaper = exports.addReportPaper = exports.getPlanningPaper = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const manufactureService_1 = require("../../../service/manufactureService");
//===============================MANUFACTURE PAPER=====================================
//get planning machine paper
const getPlanningPaper = async (req, res) => {
    const { machine } = req.query;
    try {
        const response = await manufactureService_1.manufactureService.getPlanningPaper(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningPaper = getPlanningPaper;
//create report for machine
const addReportPaper = async (req, res) => {
    const { planningId } = req.query;
    try {
        const response = await manufactureService_1.manufactureService.addReportPaper(Number(planningId), req.body, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.addReportPaper = addReportPaper;
//confirm producing paper
const confirmProducingPaper = async (req, res) => {
    const { planningId } = req.query;
    try {
        const response = await manufactureService_1.manufactureService.confirmProducingPaper(Number(planningId), req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.confirmProducingPaper = confirmProducingPaper;
//===============================MANUFACTURE BOX=====================================
//get all planning box
const getPlanningBox = async (req, res) => {
    const { machine } = req.query;
    try {
        const response = await manufactureService_1.manufactureService.getPlanningBox(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getPlanningBox = getPlanningBox;
//create report for machine
const addReportBox = async (req, res) => {
    const { planningBoxId, machine } = req.query;
    try {
        const response = await manufactureService_1.manufactureService.addReportBox(Number(planningBoxId), machine, req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.addReportBox = addReportBox;
//confirm producing box
const confirmProducingBox = async (req, res) => {
    const { planningBoxId, machine } = req.query;
    try {
        const response = await manufactureService_1.manufactureService.confirmProducingBox(Number(planningBoxId), machine, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.confirmProducingBox = confirmProducingBox;
//# sourceMappingURL=manufactureController.js.map