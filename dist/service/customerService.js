"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = void 0;
const redis_config_1 = __importDefault(require("../assest/configs/connect/redis.config"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../utils/appError");
const order_1 = require("../models/order/order");
const customer_1 = require("../models/customer/customer");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const excelExporter_1 = require("../utils/helper/excelExporter");
const customerPayment_1 = require("../models/customer/customerPayment");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const customerRepository_1 = require("../repository/customerRepository");
const melisearch_config_1 = require("../assest/configs/connect/melisearch.config");
const customerRowAndColumn_1 = require("../utils/mapping/customerRowAndColumn");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const meiliService_1 = require("./meiliService");
const devEnvironment = process.env.NODE_ENV !== "production";
const { customer } = cacheKey_1.CacheKey;
exports.customerService = {
    getAllCustomers: async ({ page = 1, pageSize = 20, noPaging = false, }) => {
        const noPagingMode = noPaging === "true";
        const cacheKey = noPaging === "true" ? customer.all : customer.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(customer_1.Customer, "customer");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("customer");
            }
            else {
                const cachedData = await redis_config_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Customer from Redis");
                    return { ...JSON.parse(cachedData), message: `Get all customers from cache` };
                }
            }
            let data, totalPages, totalCustomers;
            if (noPagingMode) {
                data = await customerRepository_1.customerRepository.findAllCustomer();
                totalCustomers = data.length;
                totalPages = 1;
            }
            else {
                const { rows, count } = await customerRepository_1.customerRepository.findCustomerByPage({ page, pageSize });
                data = rows;
                totalCustomers = count;
                totalPages = Math.ceil(totalCustomers / pageSize);
            }
            const responseData = {
                message: "Get all customers successfully",
                data,
                totalCustomers,
                totalPages,
                currentPage: noPagingMode ? 1 : page,
            };
            await redis_config_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get all customer failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getCustomerByFields: async ({ field, keyword, page, pageSize, }) => {
        try {
            const validFields = ["customerId", "customerName", "cskh", "phone"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = melisearch_config_1.meiliClient.index("customers");
            ``;
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["customerId"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            });
            const customerIds = searchResult.hits.map((hit) => hit.customerId);
            if (customerIds.length === 0) {
                return {
                    message: "No customers found",
                    data: [],
                    totalCustomers: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const { rows } = await customerRepository_1.customerRepository.findCustomerByPage({
                whereCondition: { customerId: { [sequelize_1.Op.in]: customerIds } },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = customerIds
                .map((id) => rows.find((customer) => customer.customerId === id))
                .filter(Boolean);
            return {
                message: "Get customers from Meilisearch & DB successfully",
                data: finalData,
                totalCustomers: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error(`Failed to get customers by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createCustomer: async (data) => {
        const { prefix = "CUSTOM", payment, ...customerData } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
                const existedCustomers = await customerRepository_1.customerRepository.findByIdOrMst(sanitizedPrefix, customerData.mst, transaction);
                const prefixExists = existedCustomers.some((c) => c.customerId.startsWith(sanitizedPrefix));
                const mstExists = customerData.mst && customerData.mst.trim() !== ""
                    ? existedCustomers.some((c) => c.mst === customerData.mst)
                    : false;
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
                //create customer payment
                await (0, orderHelpers_1.createDataTable)({
                    model: customerPayment_1.CustomerPayment,
                    data: { customerId: newCustomerId, ...payment },
                    transaction,
                });
                //create meilisearch
                const customerCreated = await customerRepository_1.customerRepository.findCustomerForMeili(newCustomerId, transaction);
                if (customerCreated) {
                    meiliService_1.meiliService.syncMeiliData(meiliService_1.MEILI_INDEX.CUSTOMERS, customerCreated.toJSON());
                }
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
        const { payment, ...restCustomerData } = customerData;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const customer = await customerRepository_1.customerRepository.findCustomerByPk({
                    customerId,
                    options: { transaction },
                });
                if (!customer) {
                    throw appError_1.AppError.NotFound("Customer not found", "CUSTOMER_NOT_FOUND");
                }
                await customerRepository_1.customerRepository.updateCustomer(customer, restCustomerData, transaction);
                await (0, orderHelpers_1.updateChildTable)({
                    model: customerPayment_1.CustomerPayment,
                    where: { customerId },
                    data: { customerId, ...payment },
                    transaction,
                });
                //update meilisearch
                const customerUpdated = await customerRepository_1.customerRepository.findCustomerForMeili(customerId, transaction);
                if (customerUpdated) {
                    meiliService_1.meiliService.syncMeiliData(meiliService_1.MEILI_INDEX.CUSTOMERS, customerUpdated.toJSON());
                }
                return { message: "Customer updated successfully", data: customerUpdated };
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
                        throw appError_1.AppError.Conflict(`CustomerId: ${customerId} has order and cannot be deleted`, "CUSTOMER_HAS_ORDERS");
                    }
                }
                await customer.destroy({ transaction });
                //delete record in meilisearch
                meiliService_1.meiliService.deleteMeiliData(meiliService_1.MEILI_INDEX.CUSTOMERS, customerId);
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
            const { rows } = await customerRepository_1.customerRepository.findCustomerByPage({ whereCondition });
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: rows,
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