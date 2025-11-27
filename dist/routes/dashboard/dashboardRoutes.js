"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const dashboardController_1 = require("../../controller/dashboard/dashboardController");
const router = (0, express_1.Router)();
router.get("/paper", authMiddleware_1.default, dashboardController_1.getAllDashboardPlanning);
router.get("/getDetail", authMiddleware_1.default, dashboardController_1.getDbPlanningDetail);
router.get("/getDbByField", authMiddleware_1.default, dashboardController_1.getDbPlanningByFields);
router.get("/getAll", authMiddleware_1.default, dashboardController_1.getAllDbPlanningStage);
router.post("/exportExcel", authMiddleware_1.default, dashboardController_1.exportExcelDbPlanning);
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map