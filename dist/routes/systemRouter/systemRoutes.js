"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const systemController_1 = require("../../controller/system/systemController");
const cacheController_1 = require("../../controller/system/cacheController");
const router = (0, express_1.default)();
//clear foreign key
router.post("/clear-fk", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), systemController_1.cleanAllForeignKeysDb);
//redis cache management
router.get("/redis/stats", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), cacheController_1.getCacheStatsController);
router.post("/redis/clear-cache", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), cacheController_1.clearCacheController);
exports.default = router;
//# sourceMappingURL=systemRoutes.js.map