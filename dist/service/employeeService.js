"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const appError_1 = require("../utils/appError");
const employeeBasicInfo_1 = require("../models/employee/employeeBasicInfo");
const employeeRepository_1 = require("../repository/employeeRepository");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const employeeCompanyInfo_1 = require("../models/employee/employeeCompanyInfo");
const excelExporter_1 = require("../utils/helper/excelExporter");
const employeeRowAndColumn_1 = require("../utils/mapping/employeeRowAndColumn");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const redis_connect_1 = __importDefault(require("../assets/configs/connect/redis.connect"));
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const meilisearch_connect_1 = require("../assets/configs/connect/meilisearch.connect");
const meiliService_1 = require("./meiliService");
const labelFields_1 = require("../assets/labelFields");
const devEnvironment = process.env.NODE_ENV !== "production";
const { employee } = cacheKey_1.CacheKey;
exports.employeeService = {
    getAllEmployees: async ({ page = 1, pageSize = 20, noPaging = false, }) => {
        const noPagingMode = noPaging === "true";
        const cacheKey = noPaging === "true" ? employee.all : employee.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: employeeBasicInfo_1.EmployeeBasicInfo }, { model: employeeCompanyInfo_1.EmployeeCompanyInfo }], "employee");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("employee");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Employees from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all employees from cache` };
                }
            }
            let data, totalPages, totalEmployees;
            if (noPagingMode) {
                data = await employeeRepository_1.employeeRepository.findAllEmployee();
                totalEmployees = data.length;
                totalPages = 1;
            }
            else {
                const { rows, count } = await employeeRepository_1.employeeRepository.findEmployeeByPage({ page, pageSize });
                data = rows;
                totalEmployees = count;
                totalPages = Math.ceil(totalEmployees / pageSize);
            }
            const responseData = {
                message: "Get all employees successfully",
                data,
                totalEmployees,
                totalPages,
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all employees failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getEmployeesByField: async ({ field, keyword, page, pageSize }) => {
        try {
            const validFields = ["fullName", "phoneNumber", "employeeCode", "status"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("employees");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["employeeId"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            const employeeIds = searchResult.hits.map((hit) => hit.employeeId);
            if (employeeIds.length === 0) {
                return {
                    message: "No employees found",
                    data: [],
                    totalEmployees: 0,
                    totalPages: 1,
                    currentPage: page,
                };
            }
            //query db
            const fullEmployees = await employeeRepository_1.employeeRepository.getEmployeeByField({
                employeeId: { [sequelize_1.Op.in]: employeeIds },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = employeeIds
                .map((id) => fullEmployees.find((employee) => employee.employeeId === id))
                .filter(Boolean);
            return {
                message: "Get employees from Meilisearch & DB successfully",
                data: finalData,
                totalEmployees: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error(`Failed to get employees by ${field}:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //this func use to get list shift management for report manufacture
    getEmployeeByPosition: async () => {
        try {
            const data = await employeeRepository_1.employeeRepository.findEmployeeByPosition();
            return { message: "Get all employee by position sucessfully", data };
        }
        catch (error) {
            console.error(`Failed to get employees by position`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createEmployee: async (data) => {
        const { companyInfo, ...basicInfo } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const lastEmployee = await employeeCompanyInfo_1.EmployeeCompanyInfo.findOne({
                    attributes: ["employeeCode"],
                    order: [["companyInfoId", "DESC"]],
                    lock: transaction.LOCK.UPDATE,
                    transaction,
                });
                let nextNumber = 1;
                if (lastEmployee && lastEmployee.employeeCode) {
                    const part = lastEmployee.employeeCode.split("-");
                    const lastNumber = parseInt(part[1], 10) || 0;
                    nextNumber = lastNumber + 1;
                }
                // Generate next employee code - format: PREFIX-XXX
                const prefix = companyInfo.employeeCode.toUpperCase();
                const nextCode = `${prefix}-${nextNumber.toString().padStart(3, "0")}`;
                const newBasicInfo = await employeeRepository_1.employeeRepository.createEmployee(employeeBasicInfo_1.EmployeeBasicInfo, basicInfo, transaction);
                const employeeId = newBasicInfo.employeeId;
                await (0, orderHelpers_1.createDataTable)({
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    data: { ...companyInfo, employeeId: employeeId, employeeCode: nextCode },
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                await exports.employeeService.syncEmployeeForMeili(employeeId, transaction);
                return { message: "create new employee successfully" };
            });
        }
        catch (error) {
            console.error("create employee failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateEmployee: async (employeeId, data) => {
        const { companyInfo, ...basicInfo } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const result = await employeeRepository_1.employeeRepository.findEmployeeByPk(employeeId, transaction);
                if (!result) {
                    throw appError_1.AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
                }
                //update basic info
                if (basicInfo) {
                    await employeeRepository_1.employeeRepository.updateEmployee(result, basicInfo, transaction);
                }
                //update company info if existed
                await (0, orderHelpers_1.updateChildTable)({
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    where: { employeeId: result.employeeId },
                    data: { employeeId: result.employeeId, ...companyInfo },
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                const updatedEmployee = await employeeRepository_1.employeeRepository.findEmployeeForMeili(employeeId, transaction);
                return { message: "Cập nhật nhân viên thành công", data: updatedEmployee };
            });
        }
        catch (error) {
            console.error("updated employees failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    syncEmployeeForMeili: async (employeeId, transaction) => {
        try {
            const employee = await employeeRepository_1.employeeRepository.findEmployeeForMeili(employeeId, transaction);
            if (employee) {
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.EMPLOYEES,
                    data: employee.toJSON(),
                    transaction,
                });
            }
        }
        catch (error) {
            console.error("❌ sync employee failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteEmployee: async (employeeId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const employee = await employeeRepository_1.employeeRepository.findEmployeeByPk(employeeId, transaction);
                if (!employee) {
                    throw appError_1.AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
                }
                // Xóa bản ghi chính
                await employee.destroy({ transaction });
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.deleteMeiliData(labelFields_1.MEILI_INDEX.EMPLOYEES, employeeId, transaction);
                return { message: "delete employee successfully" };
            });
        }
        catch (error) {
            console.error("delete employees failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelEmployee: async (res, { status, joinDate, all = false }) => {
        try {
            let whereCondition = {};
            if (all === "true") {
                // no filtering; fetch all employees
            }
            else if (status) {
                whereCondition["$companyInfo.status$"] = status.toLowerCase().trim();
            }
            else if (joinDate) {
                const start = new Date(joinDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                whereCondition["$companyInfo.joinDate$"] = { [sequelize_1.Op.between]: [start, end] };
            }
            const { rows } = await employeeRepository_1.employeeRepository.findEmployeeByPage({ whereCondition });
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: rows,
                sheetName: "Danh sách nhân viên",
                fileName: "employee",
                columns: employeeRowAndColumn_1.employeeColumns,
                rows: employeeRowAndColumn_1.mappingEmployeeRow,
            });
        }
        catch (error) {
            console.error("export excel employee failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=employeeService.js.map