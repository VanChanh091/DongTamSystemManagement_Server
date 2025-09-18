import Redis from "ioredis";

const redisCache = new Redis();

export const getReportPaperByField = async ({
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
}) => {
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const cacheKey = "reportPaper:search:all";

  let allReports = await redisCache.get(cacheKey);
  let sourceMessage = "";

  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
