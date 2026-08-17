import * as RedisImport from "ioredis";
const Redis = (RedisImport as any).default || RedisImport;

import dotenv from "dotenv";
dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST as string,
  port: Number(process.env.REDIS_PORT) || 6379,
  db: Number(process.env.REDIS_DB) || 0,
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
