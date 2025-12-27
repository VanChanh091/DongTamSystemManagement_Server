import * as RedisImport from "ioredis";
const Redis = (RedisImport as any).default || RedisImport;

import dotenv from "dotenv";
dotenv.config();

const redisCache = new Redis({
  host: process.env.REDIS_HOST as string,
  port: Number(process.env.REDIS_PORT) || 6379,
  db: Number(process.env.REDIS_DB) || 0,
});

redisCache.on("connect", () => console.log("✅ Redis connected"));
redisCache.on("error", (err?: Error) => console.error("❌ Redis error:", err));

export default redisCache;
