"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const customer_1 = require("../models/customer/customer");
const customerRepository_1 = require("../repository/customerRepository");
const appError_1 = require("../utils/appError");
const cacheManager_1 = require("../utils/helper/cacheManager");
const excelExporter_1 = require("../utils/helper/excelExporter");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const customerRowAndColumn_1 = require("../utils/mapping/customerRowAndColumn");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const order_1 = require("../models/order/order");
const devEnvironment = process.env.NODE_ENV !== "production";
const { customer } = cacheManager_1.CacheManager.keys;
exports.customerService = {
    getAllCustomers: async ({ page = 1, pageSize = 20, noPaging = false, }) => {
        const noPagingMode = noPaging === "true";
        const cacheKey = noPaging === "true" ? customer.all : customer.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(customer_1.Customer, "customer");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearCustomer();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Customer from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all customers from cache` };
                }
            }
            let data, totalPages;
            const totalCustomers = await customerRepository_1.customerRepository.customerCount();
            if (noPagingMode) {
                totalPages = 1;
                data = await customerRepository_1.customerRepository.findAllCustomer();
            }
            else {
                totalPages = Math.ceil(totalCustomers / pageSize);
                data = await customerRepository_1.customerRepository.findCustomerByPage(page, pageSize);
            }
            const responseData = {
                message: "Get all customers successfully",
                data,
                totalCustomers,
                totalPages,
                currentPage: noPagingMode ? 1 : page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get all customer failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getCustomerByFields: async ({ field, keyword, page, pageSize, }) => {
        try {
            const fieldMap = {
                customerId: (customer) => customer.customerId,
                customerName: (customer) => customer.customerName,
                cskh: (customer) => customer.cskh,
                phone: (customer) => customer.phone,
            };
            const key = field;
            if (!key || !fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, orderHelpers_1.filterDataFromCache)({
                model: customer_1.Customer,
                cacheKey: customer.search,
                keyword: keyword,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
            });
            return result;
        }
        catch (error) {
            console.error(`Failed to get customers by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createCustomer: async (data) => {
        const { prefix = "CUSTOM", ...customerData } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
                const existedCustomers = await customerRepository_1.customerRepository.findByIdOrMst(sanitizedPrefix, customerData.mst, transaction);
                const prefixExists = existedCustomers.some((c) => c.customerId.startsWith(sanitizedPrefix));
                const mstExists = existedCustomers.some((c) => c.mst === customerData.mst);
                if (prefixExists) {
                    throw appError_1.AppError.Conflict(`Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`, "PREFIX_ALREADY_EXISTS");
                }
                if (mstExists) {
                    throw appError_1.AppError.Conflict(`MST '${customerData.mst}' đã tồn tại`, "MST_ALREADY_EXISTS");
                }
                const maxSeq = (await customer_1.Customer.max("customerSeq", { transaction })) ?? 0;
                //create next id
                const nextId = Number(maxSeq) + 1;
                const newCustomerId = `${prefix}${String(nextId).padStart(4, "0")}`;
                const newCustomer = await customerRepository_1.customerRepository.createCustomer({ customerId: newCustomerId, customerSeq: nextId, ...customerData }, transaction);
                return { message: "Customer created successfully", data: newCustomer };
            });
        }
        catch (error) {
            console.error("❌ Failed to create customer:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateCustomer: async (customerId, customerData) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const customer = await customerRepository_1.customerRepository.findByCustomerId(customerId, transaction);
                if (!customer) {
                    throw appError_1.AppError.NotFound("Customer not found", "CUSTOMER_NOT_FOUND");
                }
                const result = await customerRepository_1.customerRepository.updateCustomer(customer, customerData, transaction);
                return { message: "Customer updated successfully", data: result };
            });
        }
        catch (error) {
            console.error("❌ Update customer failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteCustomer: async (customerId, role) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const customer = await customer_1.Customer.findByPk(customerId, {
                    attributes: ["customerId"],
                    transaction,
                });
                if (!customer) {
                    throw appError_1.AppError.NotFound("Customer not found", "CUSTOMER_NOT_FOUND");
                }
                const orderCount = await order_1.Order.count({ where: { customerId }, transaction });
                if (orderCount > 0) {
                    if (role != "admin") {
                        throw appError_1.AppError.Conflict(`Customer with ID '${customerId}' has associated orders and cannot be deleted.`, "CUSTOMER_HAS_ORDERS");
                    }
                }
                await customerRepository_1.customerRepository.deleteCustomer(customerId, transaction);
                return { message: "Customer deleted successfully" };
            });
        }
        catch (error) {
            console.error("❌ Delete customer failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelCustomer: async (res, { fromDate, toDate, all = false }) => {
        try {
            let whereCondition = {};
            if (all === "true") {
                // xuất toàn bộ -> để whereCondition = {}
            }
            else if (fromDate && toDate) {
                const start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                whereCondition.timePayment = { [sequelize_1.Op.between]: [start, end] };
            }
            const data = await customerRepository_1.customerRepository.findAllForExport(whereCondition);
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Danh sách khách hàng",
                fileName: "customer",
                columns: customerRowAndColumn_1.customerColumns,
                rows: customerRowAndColumn_1.mappingCustomerRow,
            });
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=customerService.js.map