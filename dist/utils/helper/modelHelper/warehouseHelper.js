"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOutboundByField = exports.getInboundByField = void 0;
const redisCache_1 = __importDefault(require("../../../assest/configs/redisCache"));
const warehouseRepository_1 = require("../../../repository/warehouseRepository");
const appError_1 = require("../../appError");
const cacheKey_1 = require("../cache/cacheKey");
const normalizeVN_1 = require("../normalizeVN");
const getInboundByField = async ({ keyword, getFieldValue, page, pageSize, message, }) => {
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    const { inbound } = cacheKey_1.CacheKey.warehouse;
    const cacheKey = inbound.search(page);
    try {
        let allData = await redisCache_1.default.get(cacheKey);
        let sourceMessage = "";
        if (!allData) {
            allData = await warehouseRepository_1.warehouseRepository.findInboundByPage({ paginate: false });
            await redisCache_1.default.set(cacheKey, JSON.stringify(allData), "EX", 900);
            sourceMessage = `Get inbound from DB`;
        }
        else {
            allData = JSON.parse(allData);
            sourceMessage = message || `Get inbound from cache`;
        }
        // Lọc dữ liệu
        const filteredData = allData.filter((item) => {
            const fieldValue = getFieldValue(item);
            return fieldValue != null
                ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
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
    }
    catch (error) {
        console.log(`error to get inbound`, error);
        throw appError_1.AppError.ServerError();
    }
};
exports.getInboundByField = getInboundByField;
const getOutboundByField = async ({ keyword, getFieldValue, page, pageSize, message, }) => {
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    const { outbound } = cacheKey_1.CacheKey.warehouse;
    const cacheKey = outbound.search(page);
    try {
        let allData = await redisCache_1.default.get(cacheKey);
        let sourceMessage = "";
        if (!allData) {
            allData = await warehouseRepository_1.warehouseRepository.getOutboundByPage({ paginate: false });
            await redisCache_1.default.set(cacheKey, JSON.stringify(allData), "EX", 900);
            sourceMessage = `Get outbound from DB`;
        }
        else {
            allData = JSON.parse(allData);
            sourceMessage = message || `Get outbound from cache`;
        }
        // Lọc dữ liệu
        const filteredData = allData.filter((item) => {
            const fieldValue = getFieldValue(item);
            return fieldValue != null
                ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
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
    }
    catch (error) {
        console.log(`error to get inbound`, error);
        throw appError_1.AppError.ServerError();
    }
};
exports.getOutboundByField = getOutboundByField;
//# sourceMappingURL=warehouseHelper.js.map