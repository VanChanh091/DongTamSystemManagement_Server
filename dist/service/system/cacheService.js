"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisCacheStats = exports.clearCacheService = exports.flushAllCacheAsync = exports.clearCacheByPattern = exports.clearCacheByKeys = void 0;
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
/**
 * Xóa cache theo danh sách key cụ thể bằng UNLINK (non-blocking)
 */
const clearCacheByKeys = async (keys) => {
    if (!keys || keys.length === 0)
        return 0;
    // Chia nhỏ thành từng batch 500 keys để tránh quá tải payload
    const BATCH_SIZE = 500;
    let totalDeleted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const chunk = keys.slice(i, i + BATCH_SIZE);
        const count = await redis_connect_1.default.unlink(...chunk);
        totalDeleted += count;
    }
    return totalDeleted;
};
exports.clearCacheByKeys = clearCacheByKeys;
/**
 * Xóa nhanh cache theo pattern bằng SCAN stream kết hợp UNLINK (non-blocking)
 * @param pattern Wildcard pattern, ví dụ: "order:*", "customer:*", "user:*" hoặc "*"
 * @param preserveQueues Nếu true sẽ bỏ qua các key thuộc hàng đợi BullMQ (bull:*)
 */
const clearCacheByPattern = async (pattern, preserveQueues = true) => {
    return new Promise((resolve, reject) => {
        let totalDeleted = 0;
        const BATCH_SIZE = 500;
        let keysBatch = [];
        // Sử dụng scanStream của ioredis - không block Redis event loop
        const stream = redis_connect_1.default.scanStream({
            match: pattern,
            count: BATCH_SIZE,
        });
        const flushBatch = async (keys) => {
            if (keys.length === 0)
                return;
            const count = await redis_connect_1.default.unlink(...keys);
            totalDeleted += count;
        };
        stream.on("data", async (keys) => {
            // Tạm dừng stream để xử lý batch hiện tại
            stream.pause();
            try {
                let filteredKeys = keys;
                if (preserveQueues) {
                    filteredKeys = keys.filter((key) => !key.startsWith("bull:"));
                }
                if (filteredKeys.length > 0) {
                    keysBatch.push(...filteredKeys);
                    if (keysBatch.length >= BATCH_SIZE) {
                        await flushBatch(keysBatch);
                        keysBatch = [];
                    }
                }
                stream.resume();
            }
            catch (err) {
                stream.destroy(err);
            }
        });
        stream.on("end", async () => {
            try {
                if (keysBatch.length > 0) {
                    await flushBatch(keysBatch);
                }
                resolve(totalDeleted);
            }
            catch (err) {
                reject(err);
            }
        });
        stream.on("error", (err) => {
            reject(err);
        });
    });
};
exports.clearCacheByPattern = clearCacheByPattern;
/**
 * Xóa sạch toàn bộ DB Redis hiện tại với cờ ASYNC (siêu tốc, non-blocking)
 */
const flushAllCacheAsync = async () => {
    await redis_connect_1.default.flushdb("ASYNC");
};
exports.flushAllCacheAsync = flushAllCacheAsync;
/**
 * Service tổng hợp xử lý yêu cầu xóa cache
 */
const clearCacheService = async (options) => {
    const startTime = Date.now();
    const preserveQueues = options.preserveQueues !== false;
    // 1. Trường hợp xóa trắng toàn bộ DB Redis
    if (options.flushAll) {
        await (0, exports.flushAllCacheAsync)();
        return {
            success: true,
            mode: "flushdb_async",
            deletedCount: -1, // Toàn bộ DB
            durationMs: Date.now() - startTime,
            message: "Toàn bộ Redis Cache đã được giải phóng với chế độ ASYNC",
        };
    }
    // 2. Trường hợp xóa theo danh sách keys cụ thể
    if (options.keys && options.keys.length > 0) {
        const deletedCount = await (0, exports.clearCacheByKeys)(options.keys);
        return {
            success: true,
            mode: "keys",
            deletedCount,
            durationMs: Date.now() - startTime,
            message: `Đã xóa ${deletedCount} keys từ danh sách được chỉ định`,
        };
    }
    // 3. Trường hợp xóa theo pattern (mặc định xóa toàn bộ cache ứng dụng nếu pattern="*")
    const pattern = options.pattern || "*";
    const deletedCount = await (0, exports.clearCacheByPattern)(pattern, preserveQueues);
    return {
        success: true,
        mode: "pattern",
        deletedCount,
        durationMs: Date.now() - startTime,
        message: `Đã quét và xóa nhanh ${deletedCount} keys khớp với pattern '${pattern}'`,
    };
};
exports.clearCacheService = clearCacheService;
/**
 * Lấy thông tin thống kê trạng thái cache Redis
 */
const getRedisCacheStats = async () => {
    const totalKeys = await redis_connect_1.default.dbsize();
    const memoryInfoRaw = await redis_connect_1.default.info("memory");
    // Parse thông tin memory
    const memoryUsedMatch = memoryInfoRaw.match(/used_memory_human:(.*?)\r\n/);
    const memoryPeakMatch = memoryInfoRaw.match(/used_memory_peak_human:(.*?)\r\n/);
    return {
        totalKeys,
        usedMemory: memoryUsedMatch ? memoryUsedMatch[1].trim() : "N/A",
        peakMemory: memoryPeakMatch ? memoryPeakMatch[1].trim() : "N/A",
    };
};
exports.getRedisCacheStats = getRedisCacheStats;
//# sourceMappingURL=cacheService.js.map