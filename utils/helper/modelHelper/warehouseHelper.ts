import redisCache from "../../../assest/configs/redisCache";
import { warehouseRepository } from "../../../repository/warehouseRepository";
import { AppError } from "../../appError";
import { CacheKey } from "../cache/cacheKey";
import { CacheManager } from "../cacheManager";
import { normalizeVN } from "../normalizeVN";

export const getInboundByField = async <T>({
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
}: {
  keyword: string;
  getFieldValue: (item: T) => any;
  page: number;
  pageSize: number;
  message: string;
}) => {
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const { inbound } = CacheKey.warehouse;
  const cacheKey = inbound.search(page);

  try {
    let allData = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allData) {
      allData = await warehouseRepository.findInboundByPage({ paginate: false });
      await redisCache.set(cacheKey, JSON.stringify(allData), "EX", 900);
      sourceMessage = `Get inbound from DB`;
    } else {
      allData = JSON.parse(allData);
      sourceMessage = message || `Get inbound from cache`;
    }

    // Lọc dữ liệu
    const filteredData = allData.filter((item: any) => {
      const fieldValue = getFieldValue(item);
      return fieldValue != null
        ? normalizeVN(String(fieldValue).toLowerCase()).includes(normalizeVN(lowerKeyword))
        : false;
    });

    // Phân trang
    const totalInbound = filteredData.length;
    const totalPages = Math.ceil(totalInbound / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedData = filteredData.slice(offset, offset + pageSize);

    return {
      message: sourceMessage,
      data: paginatedData,
      totalInbound,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.log(`error to get inbound`, error);
    throw AppError.ServerError();
  }
};

export const getOutboundByField = async <T>({
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
}: {
  keyword: string;
  getFieldValue: (item: T) => any;
  page: number;
  pageSize: number;
  message: string;
}) => {
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const { outbound } = CacheKey.warehouse;
  const cacheKey = outbound.search(page);

  try {
    let allData = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allData) {
      allData = await warehouseRepository.getOutboundByPage({ paginate: false });
      await redisCache.set(cacheKey, JSON.stringify(allData), "EX", 900);
      sourceMessage = `Get outbound from DB`;
    } else {
      allData = JSON.parse(allData);
      sourceMessage = message || `Get outbound from cache`;
    }

    // Lọc dữ liệu
    const filteredData = allData.filter((item: any) => {
      const fieldValue = getFieldValue(item);
      return fieldValue != null
        ? normalizeVN(String(fieldValue).toLowerCase()).includes(normalizeVN(lowerKeyword))
        : false;
    });

    // Phân trang
    const totalOutbound = filteredData.length;
    const totalPages = Math.ceil(totalOutbound / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedData = filteredData.slice(offset, offset + pageSize);

    return {
      message: sourceMessage,
      data: paginatedData,
      totalOutbound,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.log(`error to get inbound`, error);
    throw AppError.ServerError();
  }
};
