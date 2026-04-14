"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const planningPaperController_1 = require("../../controller/user/planning/planningPaperController");
const planningBoxController_1 = require("../../controller/user/planning/planningBoxController");
const planningStatusController_1 = require("../../controller/user/planning/planningStatusController");
const router = (0, express_1.Router)();
//=========================PLANNING STATUS=========================
//planning order
router.get("/planning-orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningStatusController_1.getOrderAccept);
router.post("/planning-orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningStatusController_1.planningOrder);
router.put("/planning-orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningStatusController_1.backOrderToReject);
//planning stop
router.get("/planning-stops", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningStatusController_1.getPlanningStop);
router.put("/planning-stops", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningStatusController_1.cancelOrContinuePlannning);
//=========================PLANNING PAPER=========================
router.get("/planning-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningPapers);
router.post("/planning-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.updateIndex_TimeRunning);
router.post("/export", authMiddleware_1.default, planningPaperController_1.exportExcelPlanningPaper);
router.put("/planning-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.updatePlanningPapers);
//=========================PLANNING BOX=========================
router.get("/planning-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBoxes);
router.post("/planning-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.updateIndex_TimeRunningBox);
router.put("/planning-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.updatePlanningBoxes);
//socket
router.post("/notify-planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.notifyUpdatePlanning);
exports.default = router;
//# sourceMappingURL=planningRoutes.js.map