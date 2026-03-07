"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const reportPlanningController_1 = require("../../controller/user/report/reportPlanningController");
const router = (0, express_1.Router)();
router.get("/paper", authMiddleware_1.default, reportPlanningController_1.getReportPapers);
router.get("/box", authMiddleware_1.default, reportPlanningController_1.getReportBoxes);
//==================EXPORT EXCEL=====================
router.post("/export-paper", authMiddleware_1.default, reportPlanningController_1.exportExcelReportPaper);
router.post("/export-box", authMiddleware_1.default, reportPlanningController_1.exportExcelReportBox);
exports.default = router;
//# sourceMappingURL=reportRoutes.js.map