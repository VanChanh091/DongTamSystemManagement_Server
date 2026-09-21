"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const scrapReportController_1 = require("../../controller/user/scrap/scrapReportController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.default, scrapReportController_1.getAllScrapReports);
router.post("/", authMiddleware_1.default, scrapReportController_1.createScrapReport);
router.put("/", authMiddleware_1.default, scrapReportController_1.updateScrapReport);
router.delete("/", authMiddleware_1.default, scrapReportController_1.deleteScrapReport);
router.post("/export", authMiddleware_1.default, scrapReportController_1.exportExcelScrapReports);
exports.default = router;
//# sourceMappingURL=scrapReportRoutes.js.map