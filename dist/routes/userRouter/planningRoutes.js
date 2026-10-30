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
const paperRequirementController_1 = require("../../controller/user/planning/paperRequirementController");
const router = (0, express_1.Router)();
const authorizePlanAccess = (0, permissionMiddleware_1.authorizeAccess)({
    departments: ["Operation"],
    permissions: ["plan"],
    requireDept: true,
});
// ========================= PLANNING STATUS =========================
router.get("/planning-orders", authMiddleware_1.default, authorizePlanAccess, planningStatusController_1.getOrderAccept);
router.post("/planning-orders", authMiddleware_1.default, authorizePlanAccess, planningStatusController_1.planningOrder);
router.put("/planning-orders", authMiddleware_1.default, authorizePlanAccess, planningStatusController_1.backOrderToReject);
// Planning stop
router.get("/planning-stops", authMiddleware_1.default, authorizePlanAccess, planningStatusController_1.getPlanningStop);
router.put("/planning-stops", authMiddleware_1.default, authorizePlanAccess, planningStatusController_1.cancelOrContinuePlannning);
// ========================= PLANNING PAPER =========================
router.get("/planning-papers", authMiddleware_1.default, planningPaperController_1.getPlanningPapers);
router.post("/planning-papers", authMiddleware_1.default, authorizePlanAccess, planningPaperController_1.updateIndex_TimeRunning);
router.post("/export", authMiddleware_1.default, authorizePlanAccess, planningPaperController_1.exportExcelPlanningPaper);
router.put("/planning-papers", authMiddleware_1.default, authorizePlanAccess, planningPaperController_1.handleUpdatePlanningPapers);
// ========================= PLANNING BOX =========================
router.get("/planning-boxes", authMiddleware_1.default, planningBoxController_1.getPlanningBoxes);
router.post("/planning-boxes", authMiddleware_1.default, authorizePlanAccess, planningBoxController_1.updateIndex_TimeRunningBox);
router.put("/planning-boxes", authMiddleware_1.default, authorizePlanAccess, planningBoxController_1.updatePlanningBoxes);
// ========================= PAPER REQUIREMENTS =========================
router.get("/paper-requirements", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Operation"], permissions: ["plan", "manager"] }), paperRequirementController_1.getPaperRequirements);
router.get("/paper-requirements/summary", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Operation"], permissions: ["plan", "manager"] }), paperRequirementController_1.calculateSummaryByGhepKho);
// Socket notification
router.post("/notify-planning", authMiddleware_1.default, authorizePlanAccess, planningPaperController_1.notifyUpdatePlanning);
exports.default = router;
//# sourceMappingURL=planningRoutes.js.map