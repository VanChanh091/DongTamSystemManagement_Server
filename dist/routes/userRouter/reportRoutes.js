"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const reportPlanningController_1 = require("../../controller/user/report/reportPlanningController");
const router = (0, express_1.Router)();
//==================Report Planning Paper=====================
router.get("/reportPaper", authMiddleware_1.default, reportPlanningController_1.getReportPlanningPaper);
router.get("/reportPaper/filter", authMiddleware_1.default, reportPlanningController_1.getReportedPaperByField);
//==================Report Planning Box=====================
router.get("/reportBox", authMiddleware_1.default, reportPlanningController_1.getReportPlanningBox);
router.get("/reportBox/filter", authMiddleware_1.default, reportPlanningController_1.getReportedBoxByField);
//==================EXPORT EXCEL=====================
router.post("/exportExcelPaper", authMiddleware_1.default, reportPlanningController_1.exportExcelReportPaper);
router.post("/exportExcelBox", authMiddleware_1.default, reportPlanningController_1.exportExcelReportBox);
exports.default = router;
//# sourceMappingURL=reportRoutes.js.map