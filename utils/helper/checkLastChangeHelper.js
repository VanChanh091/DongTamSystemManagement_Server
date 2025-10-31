import Redis from "ioredis";

const redisClient = new Redis();

export const checkLastChange = async (Model, cacheKey) => {
  const [lastCreated, lastUpdated] = await Promise.all([
    Model.max("createdAt"),
    Model.max("updatedAt"),
  ]);

  const lastChange = new Date(
    Math.max(new Date(lastCreated || 0).getTime(), new Date(lastUpdated || 0).getTime())
  ).toISOString();

  const lastCached = await redisClient.get(cacheKey);

  const isChanged = lastCached !== lastChange;

  if (isChanged) {
    await redisClient.set(cacheKey, lastChange);
  }

  return { isChanged, lastChange };
};
