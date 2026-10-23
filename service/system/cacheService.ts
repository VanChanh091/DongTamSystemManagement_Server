import redisCache from "../../assets/configs/connect/redis.connect";

export interface ClearCacheOptions {
  pattern?: string;
  keys?: string[];
  flushAll?: boolean;
  preserveQueues?: boolean; // Mặc định true: không xóa key bắt đầu bằng bull:
}

export interface ClearCacheResult {
  success: boolean;
  mode: "flushdb_async" | "pattern" | "keys";
  deletedCount: number;
  durationMs: number;
  message: string;
}

/**
 * Xóa cache theo danh sách key cụ thể bằng UNLINK (non-blocking)
 */
export const clearCacheByKeys = async (keys: string[]): Promise<number> => {
  if (!keys || keys.length === 0) return 0;

  // Chia nhỏ thành từng batch 500 keys để tránh quá tải payload
  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const chunk = keys.slice(i, i + BATCH_SIZE);
    const count = await redisCache.unlink(...chunk);
    totalDeleted += count;
  }

  return totalDeleted;
};

/**
 * Xóa nhanh cache theo pattern bằng SCAN stream kết hợp UNLINK (non-blocking)
 * @param pattern Wildcard pattern, ví dụ: "order:*", "customer:*", "user:*" hoặc "*"
 * @param preserveQueues Nếu true sẽ bỏ qua các key thuộc hàng đợi BullMQ (bull:*)
 */
export const clearCacheByPattern = async (
  pattern: string,
  preserveQueues: boolean = true,
): Promise<number> => {
  return new Promise((resolve, reject) => {
    let totalDeleted = 0;
    const BATCH_SIZE = 500;
    let keysBatch: string[] = [];

    // Sử dụng scanStream của ioredis - không block Redis event loop
    const stream = redisCache.scanStream({
      match: pattern,
      count: BATCH_SIZE,
    });

    const flushBatch = async (keys: string[]) => {
      if (keys.length === 0) return;
      const count = await redisCache.unlink(...keys);
      totalDeleted += count;
    };

    stream.on("data", async (keys: string[]) => {
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
      } catch (err) {
        stream.destroy(err as Error);
      }
    });

    stream.on("end", async () => {
      try {
        if (keysBatch.length > 0) {
          await flushBatch(keysBatch);
        }
        resolve(totalDeleted);
      } catch (err) {
        reject(err);
      }
    });

    stream.on("error", (err: any) => {
      reject(err);
    });
  });
};

/**
 * Xóa sạch toàn bộ DB Redis hiện tại với cờ ASYNC (siêu tốc, non-blocking)
 */
export const flushAllCacheAsync = async (): Promise<void> => {
  await redisCache.flushdb("ASYNC");
};

/**
 * Service tổng hợp xử lý yêu cầu xóa cache
 */
export const clearCacheService = async (options: ClearCacheOptions): Promise<ClearCacheResult> => {
  const startTime = Date.now();
  const preserveQueues = options.preserveQueues !== false;

  // 1. Trường hợp xóa trắng toàn bộ DB Redis
  if (options.flushAll) {
    await flushAllCacheAsync();
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
    const deletedCount = await clearCacheByKeys(options.keys);
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
  const deletedCount = await clearCacheByPattern(pattern, preserveQueues);

  return {
    success: true,
    mode: "pattern",
    deletedCount,
    durationMs: Date.now() - startTime,
    message: `Đã quét và xóa nhanh ${deletedCount} keys khớp với pattern '${pattern}'`,
  };
};

/**
 * Lấy thông tin thống kê trạng thái cache Redis
 */
export const getRedisCacheStats = async () => {
  const totalKeys = await redisCache.dbsize();
  const memoryInfoRaw = await redisCache.info("memory");

  // Parse thông tin memory
  const memoryUsedMatch = memoryInfoRaw.match(/used_memory_human:(.*?)\r\n/);
  const memoryPeakMatch = memoryInfoRaw.match(/used_memory_peak_human:(.*?)\r\n/);

  // lấy tất cả keys đang được cache
  const keys: string[] = [];
  let cursor = "0";
  do {
    const reply = await redisCache.scan(cursor, "MATCH", "*", "COUNT", "100");
    cursor = reply[0];
    keys.push(...reply[1]);
  } while (cursor !== "0");

  return {
    totalKeys,
    usedMemory: memoryUsedMatch ? memoryUsedMatch[1].trim() : "N/A",
    peakMemory: memoryPeakMatch ? memoryPeakMatch[1].trim() : "N/A",
    keys,
  };
};
