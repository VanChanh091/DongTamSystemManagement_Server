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
  retryStrategy(times: number) {
    // Tự động thử lại khi mạng bị chập chờn
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
};

const redisCache = new Redis(redisConfig);

const pubClient = new Redis(redisConfig);
const subClient = pubClient.duplicate();

redisCache.on("connect", () => console.log("✅ Redis connected"));
redisCache.on("error", (err?: Error) => console.error("❌ Redis error:", err));

pubClient.on("error", (err?: Error) => console.error("❌ Redis Pub error:", err));
subClient.on("error", (err?: Error) => console.error("❌ Redis Sub error:", err));

export { pubClient, subClient };
export default redisCache;
