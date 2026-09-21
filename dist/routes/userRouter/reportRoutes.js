"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const reportPlanningController_1 = require("../../controller/user/report/reportPlanningController");
const qcInspectionController_1 = require("../../controller/user/QC/qcInspectionController");
const router = (0, express_1.Router)();
//==================PAPER AND BOX====================
router.get("/paper", authMiddleware_1.default, reportPlanningController_1.getReportPapers);
router.get("/box", authMiddleware_1.default, reportPlanningController_1.getReportBoxes);
//==================INSPECTION====================
router.get("/inspection", authMiddleware_1.default, qcInspectionController_1.getQcInspection);
router.get("/inspection/summary", authMiddleware_1.default, reportPlanningController_1.getReportQcInspectionSummary);
//==================EXPORT EXCEL=====================
router.post("/export-paper", authMiddleware_1.default, reportPlanningController_1.exportExcelReportPaper);
router.post("/export-box", authMiddleware_1.default, reportPlanningController_1.exportExcelReportBox);
exports.default = router;
//# sourceMappingURL=reportRoutes.js.map