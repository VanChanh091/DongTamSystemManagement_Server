"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const qcController_1 = require("../../controller/user/QC/qcController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.Router)();
//==================QC SESSION======================
router.get("/getSession", authMiddleware_1.default, qcController_1.getAllQcSession);
router.get("/getSessionByFk", authMiddleware_1.default, qcController_1.getSessionByFk);
router.post("/newSession", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcController_1.createNewSession);
router.put("/updateSession", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcController_1.updateSession);
//==================QC RESULT=======================
router.get("/getResult", authMiddleware_1.default, qcController_1.getAllQcResult);
router.post("/newResult", (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), authMiddleware_1.default, qcController_1.createNewResult);
router.put("/updateResult", (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), authMiddleware_1.default, qcController_1.updateResult);
router.put("/confirmFinalize", (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), authMiddleware_1.default, qcController_1.confirmFinalizeSession);
//==================ORCHESTRATOR=======================
router.post("/submitQC", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), qcController_1.submitQC);
exports.default = router;
//# sourceMappingURL=qualityControlRoutes.js.map