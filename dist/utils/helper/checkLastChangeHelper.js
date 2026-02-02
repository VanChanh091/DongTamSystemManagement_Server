"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLastChange = void 0;
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const checkLastChange = async (models, cacheKey, { setCache = true } = {}) => {
    const modelArray = Array.isArray(models) ? models : [models];
    const details = [];
    const lastChanges = await Promise.all(modelArray.map(async (item) => {
        const model = item.model || item;
        const where = item.where || undefined;
        //Lấy thông tin thời gian & số lượng dòng
        const [lastCreated, lastUpdated, totalCount] = await Promise.all([
            model.max("createdAt", { where }),
            model.max("updatedAt", { where }),
            model.count({ where }),
        ]);
        const latestTime = Math.max(new Date(lastCreated || 0).getTime(), new Date(lastUpdated || 0).getTime());
        const signature = `${model.name}:${latestTime}_${totalCount}`;
        // Lưu thông tin chi tiết để debug
        details.push({
            model: model.name,
            latestTime: new Date(latestTime).toISOString(),
            count: totalCount,
        });
        return signature;
    }));
    //Gộp tất cả thành chữ ký tổng
    const combinedSignature = lastChanges.join("|");
    //So sánh với cache Redis
    const lastCached = await redisCache_1.default.get(cacheKey);
    const isChanged = lastCached !== combinedSignature;
    if (setCache && isChanged) {
        await redisCache_1.default.set(cacheKey, combinedSignature);
    }
    // 5️⃣ Log debug cho dev mode
    if (process.env.NODE_ENV !== "production") {
        console.table(details);
        // console.log(`Cache Key: ${cacheKey}`);
        console.log(`isChanged: ${isChanged}`);
    }
    return { isChanged, lastChange: combinedSignature };
};
exports.checkLastChange = checkLastChange;
//# sourceMappingURL=checkLastChangeHelper.js.map