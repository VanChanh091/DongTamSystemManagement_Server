import * as RedisImport from "ioredis";
const Redis = (RedisImport as any).default || RedisImport;

import dotenv from "dotenv";
dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST as string,
  port: Number(process.env.REDIS_PORT) || 6379,
  db: Number(process.env.REDIS_DB) || 0,
  keepAlive: 10000, // Gửi TCP keepalive probe mỗi 10 giây
  connectTimeout: 10000, // Chờ kết nối tối đa 10s
  maxRetriesPerRequest: null, // BẮT BUỘC đối với BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    // Giãn cách thời gian thử lại: 1s, 2s, 3s... tối đa 15s (tránh spam CPU và console)
    const delay = Math.min(times * 1000, 15000);
    return delay;
  },
};

const redisCache = new Redis(redisConfig);

const pubClient = new Redis(redisConfig);
const subClient = pubClient.duplicate();

// Gộp log của cả 3 client vào 1 dòng duy nhất
const connectedClients = new Set<string>();
let isRedisDown = false;

function handleClientReady(name: string) {
  connectedClients.add(name);
  // Khi cả 3 client đều đã sẵn sàng thì mới log 1 dòng duy nhất
  if (connectedClients.size === 3) {
    if (isRedisDown) {
      console.log("✅ Redis đã kết nối lại thành công! (Cache, Pub, Sub)");
      isRedisDown = false;
    } else {
      console.log("✅ Redis connected! (Cache, Pub, Sub)");
    }
  }
}

function handleClientError(name: string, err: any) {
  connectedClients.delete(name);
  if (!isRedisDown) {
    isRedisDown = true;
    console.warn(
      `⚠️ Mất kết nối tới Redis (${err?.address || process.env.REDIS_HOST}:${err?.port || 6379} - ${err?.code || err?.message}). Đang tự động kết nối lại ngầm...`,
    );
  }
}

redisCache.on("ready", () => handleClientReady("Cache"));
pubClient.on("ready", () => handleClientReady("Pub"));
subClient.on("ready", () => handleClientReady("Sub"));

redisCache.on("error", (err: any) => handleClientError("Cache", err));
pubClient.on("error", (err: any) => handleClientError("Pub", err));
subClient.on("error", (err: any) => handleClientError("Sub", err));

export { pubClient, subClient };
export default redisCache;
