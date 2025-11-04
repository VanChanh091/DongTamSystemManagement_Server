import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redisCache = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  db: process.env.REDIS_DB,
});

redisCache.on("connect", () => console.log("✅ Redis connected"));
redisCache.on("error", (err) => console.error("❌ Redis error:", err));

export default redisCache;
