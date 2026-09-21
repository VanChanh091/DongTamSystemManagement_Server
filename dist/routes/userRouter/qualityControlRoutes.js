"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const qcController_1 = require("../../controller/user/QC/qcController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const scrapReportController_1 = require("../../controller/user/scrap/scrapReportController");
const qcInspectionController_1 = require("../../controller/user/QC/qcInspectionController");
const router = (0, express_1.Router)();
//==================QC SESSION======================
router.get("/session", authMiddleware_1.default, qcController_1.getQcSession);
router.post("/session", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcController_1.createNewSession);
router.put("/session", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcController_1.updateSession);
//==================QC RESULT=======================
router.get("/result", authMiddleware_1.default, qcController_1.getAllQcResult);
router.post("/result", (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), authMiddleware_1.default, qcController_1.createNewResult);
router.put("/result", (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), authMiddleware_1.default, qcController_1.updateResult);
//==================ORCHESTRATOR=======================
router.post("/submit", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcController_1.submitQC);
//==================INSPECTION CHECK====================
router.post("/inspection", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcInspectionController_1.checkingInspection);
//using to check for producing
router.get("/inspection/check", authMiddleware_1.default, qcInspectionController_1.getQcInspectionErr);
//====================SCRAP REPORT======================
router.put("/scrap-report", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), scrapReportController_1.handleUpdateScrapReport);
exports.default = router;
//# sourceMappingURL=qualityControlRoutes.js.map