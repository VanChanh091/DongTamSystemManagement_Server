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
const planningStopController_1 = require("../../controller/user/planning/planningStopController");
const router = (0, express_1.Router)();
//=========================WAITING FOR PLANNING=========================
router.get("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getOrderAccept);
router.post("/planningOrder", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.planningOrder);
//=========================PLANNING PAPER=========================
router.get("/byMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningByMachine);
router.get("/filterPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningPaperByfield);
router.post("/updateIndex_TimeRunningPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.updateIndex_TimeRunning);
router.put("/changeMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.changeMachinePlanning);
router.put("/pauseOrAcceptLackQtyPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.pauseOrAcceptLackQtyPLanning);
//=========================PLANNING BOX=========================
router.get("/byMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBox);
router.get("/filterBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBoxByfield);
router.post("/updateIndex_TimeRunningBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.updateIndex_TimeRunningBox);
router.put("/acceptLackQtyBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.acceptLackQtyBox);
//=========================PLANNING BOX=========================
router.get("/getPlanningStop", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningStopController_1.getPlanningStop);
exports.default = router;
//# sourceMappingURL=planningRoutes.js.map