"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const manufactureController_1 = require("../../controller/user/manufacture/manufactureController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.Router)();
const authorizePaperAccess = ({ departments = [], permissions = [], requireDept = true, } = {}) => (0, permissionMiddleware_1.authorizeAccess)({
    departments: [...new Set(["Production", ...departments])],
    permissions: [
        ...new Set([
            "machine1350",
            "machine1800",
            "machine1900",
            "machine2Layer",
            "MachineRollPaper",
            ...permissions,
        ]),
    ],
    requireDept,
});
const authorizeBoxAccess = ({ departments = [], permissions = [], requireDept = true, } = {}) => (0, permissionMiddleware_1.authorizeAccess)({
    departments: [...new Set(["Production", ...departments])],
    permissions: [...new Set(["step2Production", ...permissions])],
    requireDept,
});
//=========================PAPER=========================
router.get("/paper", authMiddleware_1.default, manufactureController_1.getPlanningPaper);
router.post("/paper", authMiddleware_1.default, authorizePaperAccess(), manufactureController_1.addReportPaper);
router.put("/paper", authMiddleware_1.default, authorizePaperAccess({ permissions: ["QC"], requireDept: false }), manufactureController_1.updateReportPaper);
//=========================BOX=========================
router.get("/box", authMiddleware_1.default, manufactureController_1.getPlanningBox);
router.post("/box", authMiddleware_1.default, authorizeBoxAccess(), manufactureController_1.addReportBox);
router.put("/box", authMiddleware_1.default, authorizeBoxAccess({ permissions: ["QC"], requireDept: false }), manufactureController_1.updateReportBox);
exports.default = router;
//# sourceMappingURL=manufactureRoutes.js.map