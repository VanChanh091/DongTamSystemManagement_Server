"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subClient = exports.pubClient = exports.redisConfig = void 0;
const RedisImport = __importStar(require("ioredis"));
const Redis = RedisImport.default || RedisImport;
const dayjs_config_1 = require("../dayjs/dayjs.config");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.redisConfig = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
    db: Number(process.env.REDIS_DB) || 0,
    keepAlive: 10000, // Gửi TCP keepalive probe mỗi 10 giây
    connectTimeout: 10000, // Chờ kết nối tối đa 10s
    maxRetriesPerRequest: null, // BẮT BUỘC đối với BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        // Giãn cách thời gian thử lại: 1s, 2s, 3s... tối đa 15s (tránh spam CPU và console)
        const delay = Math.min(times * 1000, 15000);
        return delay;
    },
};
const redisCache = new Redis(exports.redisConfig);
const pubClient = new Redis(exports.redisConfig);
exports.pubClient = pubClient;
const subClient = pubClient.duplicate();
exports.subClient = subClient;
// Gộp log của cả 3 client vào 1 dòng duy nhất
const connectedClients = new Set();
let isRedisDown = false;
const getTimestamp = () => dayjs_config_1.dayjsUtc.tz(new Date(), dayjs_config_1.VN_TZ).format("YYYY-MM-DD HH:mm:ss");
function handleClientReady(name) {
    connectedClients.add(name);
    // Khi cả 3 client đều đã sẵn sàng thì mới log 1 dòng duy nhất
    if (connectedClients.size === 3) {
        if (isRedisDown) {
            console.log(`[${getTimestamp()}] ✅ Redis đã kết nối lại thành công! (Cache, Pub, Sub)`);
            isRedisDown = false;
        }
        else {
            console.log(`[${getTimestamp()}] ✅ Redis connected! (Cache, Pub, Sub)`);
        }
    }
}
function handleClientError(name, err) {
    connectedClients.delete(name);
    if (!isRedisDown) {
        isRedisDown = true;
        console.warn(`[${getTimestamp()}] ⚠️ Mất kết nối tới Redis (${err?.address || process.env.REDIS_HOST}:${err?.port || 6379} - ${err?.code || err?.message}). Đang tự động kết nối lại ngầm...`);
    }
}
redisCache.on("ready", () => handleClientReady("Cache"));
pubClient.on("ready", () => handleClientReady("Pub"));
subClient.on("ready", () => handleClientReady("Sub"));
redisCache.on("error", (err) => handleClientError("Cache", err));
pubClient.on("error", (err) => handleClientError("Pub", err));
subClient.on("error", (err) => handleClientError("Sub", err));
exports.default = redisCache;
//# sourceMappingURL=redis.connect.js.map