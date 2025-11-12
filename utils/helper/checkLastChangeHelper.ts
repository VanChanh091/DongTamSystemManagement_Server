import redisCache from "../../configs/redisCache";
import dotenv from "dotenv";
dotenv.config();

export const checkLastChange = async (models: any, cacheKey: string, { setCache = true } = {}) => {
  const modelArray = Array.isArray(models) ? models : [models];

  const details: any[] = [];

  const lastChanges = await Promise.all(
    modelArray.map(async (item) => {
      const model = item.model || item;
      const where = item.where || undefined;

      //Lấy thông tin thời gian & số lượng dòng
      const [lastCreated, lastUpdated, totalCount] = await Promise.all([
        model.max("createdAt", { where }),
        model.max("updatedAt", { where }),
        model.count({ where }),
      ]);

      const latestTime = Math.max(
        new Date(lastCreated || 0).getTime(),
        new Date(lastUpdated || 0).getTime()
      );

      const signature = `${model.name}:${latestTime}_${totalCount}`;

      // Lưu thông tin chi tiết để debug
      details.push({
        model: model.name,
        latestTime: new Date(latestTime).toISOString(),
        count: totalCount,
      });

      return signature;
    })
  );

  //Gộp tất cả thành chữ ký tổng
  const combinedSignature = lastChanges.join("|");

  //So sánh với cache Redis
  const lastCached = await redisCache.get(cacheKey);
  const isChanged = lastCached !== combinedSignature;

  if (setCache && isChanged) {
    await redisCache.set(cacheKey, combinedSignature);
  }

  // console.log(
  //   "🔍 last changes by model:",
  //   modelArray.map((item, i) => ({
  //     model: item.model ? item.model.name : item.name,
  //     last: new Date(lastChanges[i]).toISOString(),
  //   }))
  // );

  // 5️⃣ Log debug cho dev mode
  if (process.env.NODE_ENV !== "production") {
    console.table(details);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`isChanged: ${isChanged}`);
  }

  return { isChanged, lastChange: combinedSignature };
};
