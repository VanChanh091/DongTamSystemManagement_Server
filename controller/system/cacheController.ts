import { Request, Response, NextFunction } from "express";
import {
  clearCacheService,
  getRedisCacheStats,
  ClearCacheOptions,
} from "../../service/system/cacheService";

// API Xóa nhanh Cache Redis
// Body: { pattern?: string, keys?: string[], flushAll?: boolean, preserveQueues?: boolean }
export const clearCacheController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pattern, keys, flushAll, preserveQueues } = req.body as ClearCacheOptions;

    // Không cho phép gọi flushAll nếu không truyền cờ rõ ràng
    const options: ClearCacheOptions = {
      pattern,
      keys,
      flushAll: Boolean(flushAll),
      preserveQueues: preserveQueues !== false,
    };

    const result = await clearCacheService(options);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// API Thống kê số lượng key & RAM sử dụng của Redis
export const getCacheStatsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getRedisCacheStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
