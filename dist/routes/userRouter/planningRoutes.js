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
const router = (0, express_1.Router)();
//=========================WAITING FOR PLANNING=========================
router.get("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getOrderAccept);
router.post("/planningOrder", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.planningOrder);
//=========================PLANNING PAPER=========================
router.get("/byMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningByMachine);
router.post("/updateIndex_TimeRunningPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.updateIndex_TimeRunning);
router.put("/changeMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.changeMachinePlanning);
router.put("/pauseOrAcceptLackQtyPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.pauseOrAcceptLackQtyPLanning);
//get properties of planning paper
router.get("/getCusNamePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningByCustomerName);
router.get("/getFlutePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningByFlute);
router.get("/getGhepKhoPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningByGhepKho);
router.get("/getOrderIdPaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningPaperController_1.getPlanningByOrderId);
//=========================PLANNING BOX=========================
router.get("/byMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBox);
router.post("/updateIndex_TimeRunningBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.updateIndex_TimeRunningBox);
router.put("/acceptLackQtyBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.acceptLackQtyBox);
//get properties of planning box
router.get("/getOrderIdBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBoxByOrderId);
router.get("/getCusNameBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBoxByCusName);
router.get("/getFluteBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBoxByFlute);
router.get("/getQcBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), planningBoxController_1.getPlanningBoxByQcBox);
exports.default = router;
//# sourceMappingURL=planningRoutes.js.map