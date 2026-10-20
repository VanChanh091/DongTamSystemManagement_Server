"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheStatsController = exports.clearCacheController = void 0;
const cacheService_1 = require("../../service/system/cacheService");
// API Xóa nhanh Cache Redis
// Body: { pattern?: string, keys?: string[], flushAll?: boolean, preserveQueues?: boolean }
const clearCacheController = async (req, res, next) => {
    try {
        const { pattern, keys, flushAll, preserveQueues } = req.body;
        // Không cho phép gọi flushAll nếu không truyền cờ rõ ràng
        const options = {
            pattern,
            keys,
            flushAll: Boolean(flushAll),
            preserveQueues: preserveQueues !== false,
        };
        const result = await (0, cacheService_1.clearCacheService)(options);
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.clearCacheController = clearCacheController;
// API Thống kê số lượng key & RAM sử dụng của Redis
const getCacheStatsController = async (req, res, next) => {
    try {
        const stats = await (0, cacheService_1.getRedisCacheStats)();
        return res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getCacheStatsController = getCacheStatsController;
//# sourceMappingURL=cacheController.js.map