// Hàm hỗ trợ: quét và xóa các key theo pattern bằng SCAN
export const deleteKeysByPattern = async (redisClient, pattern) => {
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      const pipeline = redisClient.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();
    }
  } while (cursor !== "0");
};
