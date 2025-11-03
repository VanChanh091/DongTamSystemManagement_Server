import Redis from "ioredis";

const redisCache = new Redis();

export const checkLastChange = async (models, cacheKey) => {
  //truyền 1 model hoặc nhiều model
  const modelArray = Array.isArray(models) ? models : [models];

  // Duyệt qua từng model, lấy max createdAt/updatedAt
  const lastChanges = await Promise.all(
    modelArray.map(async (item) => {
      const model = item.model || item;
      const where = item.where || undefined;

      const [lastCreated, lastUpdated] = await Promise.all([
        model.max("createdAt", { where }),
        model.max("updatedAt", { where }),
      ]);

      return new Date(
        Math.max(new Date(lastCreated || 0).getTime(), new Date(lastUpdated || 0).getTime())
      ).getTime();
    })
  );

  console.log(
    "🔍 last changes by model:",
    modelArray.map((item, i) => ({
      model: item.model ? item.model.name : item.name,
      last: new Date(lastChanges[i]).toISOString(),
    }))
  );

  // Lấy timestamp mới nhất trong tất cả bảng
  const latestChange = Math.max(...lastChanges);
  const lastChangeISO = new Date(latestChange).toISOString();

  //So sánh với cache Redis
  const lastCached = await redisCache.get(cacheKey);
  const isChanged = lastCached !== lastChangeISO;

  if (isChanged) {
    await redisCache.set(cacheKey, lastChangeISO);
  }

  return { isChanged, lastChange: lastChangeISO };
};
