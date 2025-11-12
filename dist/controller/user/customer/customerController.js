"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelCustomer = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.checkCustomerInOrders = exports.getCustomerByField = exports.getAllCustomer = void 0;
const customer_1 = require("../../../models/customer/customer");
const sequelize_1 = require("sequelize");
const generateNextId_1 = require("../../../utils/helper/generateNextId");
const excelExporter_1 = require("../../../utils/helper/excelExporter");
const orderHelpers_1 = require("../../../utils/helper/modelHelper/orderHelpers");
const order_1 = require("../../../models/order/order");
const customerRowAndColumn_1 = require("../../../utils/mapping/customerRowAndColumn");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//get all
const getAllCustomer = async (req, res) => {
    const { page = 1, pageSize = 20, noPaging = false } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const noPagingMode = noPaging === "true";
    const { customer } = cacheManager_1.CacheManager.keys;
    const cacheKey = noPaging === "true" ? customer.all : customer.page(currentPage);
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
                return res.status(200).json({ ...parsed, message: "Get all customers from cache" });
            }
        }
        let data, totalPages;
        const totalCustomers = await customer_1.Customer.count();
        //noPagingMode to find customer for order
        if (noPagingMode) {
            totalPages = 1;
            data = await customer_1.Customer.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
            });
        }
        else {
            totalPages = Math.ceil(totalCustomers / currentPageSize);
            data = await customer_1.Customer.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
                offset: (currentPage - 1) * currentPageSize,
                limit: currentPageSize,
                order: [
                    //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                    [sequelize_1.Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
                ],
            });
        }
        const responseData = {
            message: "get all customers successfully",
            data,
            totalCustomers,
            totalPages,
            currentPage: noPagingMode ? 1 : currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
        res.status(200).json(responseData);
    }
    catch (err) {
        console.error("get all customer failed:", err);
        res.status(500).json({ message: "get all customers failed", err });
    }
};
exports.getAllCustomer = getAllCustomer;
//get by field
const getCustomerByField = async (req, res) => {
    const { field, keyword, page, pageSize } = req.query;
    const fieldMap = {
        customerId: (customer) => customer.customerId,
        customerName: (customer) => customer.customerName,
        cskh: (customer) => customer.cskh,
        phone: (customer) => customer.phone,
    };
    const key = field;
    if (!key || !fieldMap[key]) {
        return res.status(400).json({ message: "Invalid field parameter" });
    }
    const { customer } = cacheManager_1.CacheManager.keys;
    try {
        const result = await (0, orderHelpers_1.filterDataFromCache)({
            model: customer_1.Customer,
            cacheKey: customer.search,
            keyword: keyword,
            getFieldValue: fieldMap[key],
            page,
            pageSize,
            message: `get all by ${field} from filtered cache`,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        console.error(`Failed to get customers by ${field}:`, error);
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getCustomerByField = getCustomerByField;
//get customerId in orders //unfinished
const checkCustomerInOrders = async (req, res) => {
    const { customerId } = req.query;
    try {
        const orderCount = await order_1.Order.count({ where: { customerId: customerId } });
        res.status(200).json({ hasOrders: orderCount > 0, orderCount });
    }
    catch (error) {
        console.error("Check customer in orders failed:", error);
        res.status(500).json({ message: "Check customer in orders failed", error });
    }
};
exports.checkCustomerInOrders = checkCustomerInOrders;
//create customer
const createCustomer = async (req, res) => {
    const { prefix = "CUSTOM", ...customerData } = req.body;
    const transaction = await customer_1.Customer.sequelize?.transaction();
    try {
        const customers = await customer_1.Customer.findAll({
            attributes: ["customerId"],
            transaction,
        });
        const allCustomerIds = customers.map((c) => c.customerId);
        const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
        const newCustomerId = (0, generateNextId_1.generateNextId)(allCustomerIds, sanitizedPrefix, 4);
        const newCustomer = await customer_1.Customer.create({
            customerId: newCustomerId,
            ...customerData,
        }, { transaction });
        await transaction?.commit();
        res.status(201).json({ message: "Customer created successfully", data: newCustomer });
    }
    catch (err) {
        await transaction?.rollback();
        console.error("Update customer failed:", err);
        res.status(500).json({ message: "Failed to create customer", err });
    }
};
exports.createCustomer = createCustomer;
// update
const updateCustomer = async (req, res) => {
    const { customerId } = req.query;
    const { ...customerData } = req.body;
    const transaction = await customer_1.Customer.sequelize?.transaction();
    try {
        const customer = await customer_1.Customer.findOne({ where: { customerId: customerId }, transaction });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        await customer.update(customerData, { transaction });
        await transaction?.commit();
        res.status(201).json({ message: "Customer updated successfully", customer });
    }
    catch (err) {
        await transaction?.rollback();
        console.error("Update customer failed:", err);
        res.status(500).json({ message: "Update customer failed", err });
    }
};
exports.updateCustomer = updateCustomer;
// delete
const deleteCustomer = async (req, res) => {
    const { customerId } = req.query;
    const transaction = await customer_1.Customer.sequelize?.transaction();
    try {
        const deletedCustomer = await customer_1.Customer.destroy({
            where: { customerId: customerId },
            transaction,
        });
        if (!deletedCustomer) {
            await transaction?.rollback();
            return res.status(404).json({ message: "Customer not found" });
        }
        await transaction?.commit();
        res.status(201).json({ message: "Customer deleted successfully" });
    }
    catch (err) {
        await transaction?.rollback();
        console.error("Delete customer failed:", err);
        res.status(500).json({ message: "Delete customer failed", err });
    }
};
exports.deleteCustomer = deleteCustomer;
//export excel
const exportExcelCustomer = async (req, res) => {
    const { fromDate, toDate, all = false } = req.body;
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
        const data = await customer_1.Customer.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            order: [
                //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
            ],
        });
        await (0, excelExporter_1.exportExcelResponse)(res, {
            data: data,
            sheetName: "Danh sách khách hàng",
            fileName: "customer",
            columns: customerRowAndColumn_1.customerColumns,
            rows: customerRowAndColumn_1.mappingCustomerRow,
        });
    }
    catch (error) {
        console.error("Export Excel error:", error);
        res.status(500).json({ message: "Lỗi xuất Excel" });
    }
};
exports.exportExcelCustomer = exportExcelCustomer;
//# sourceMappingURL=customerController.js.map