"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const dashboard_1 = require("../../controller/dashboard/dashboard");
const router = (0, express_1.Router)();
router.get("/paper", authMiddleware_1.default, dashboard_1.getAllDataPaper);
router.get("/box", authMiddleware_1.default, dashboard_1.getAllDataBox);
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map