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
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
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
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Employees from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all employees from cache` };
                }
            }
            let data, totalPages;
            const totalEmployees = await employeeRepository_1.employeeRepository.employeeCount();
            if (noPagingMode) {
                totalPages = 1;
                data = await employeeRepository_1.employeeRepository.findAllEmployee();
            }
            else {
                totalPages = Math.ceil(totalEmployees / pageSize);
                data = await employeeRepository_1.employeeRepository.findEmployeeByPage(page, pageSize);
            }
            const responseData = {
                message: "Get all employees successfully",
                data,
                totalEmployees,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all employees failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getEmployeesByField: async ({ field, keyword, page, pageSize, }) => {
        try {
            const fieldMap = {
                employeeId: (employee) => employee.employeeId,
                fullName: (employee) => employee.fullName,
                phoneNumber: (employee) => employee.phoneNumber,
                employeeCode: (employee) => employee.companyInfo?.employeeCode,
                status: (employee) => employee.companyInfo.status,
            };
            const key = field;
            if (!fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, orderHelpers_1.filterDataFromCache)({
                model: employeeBasicInfo_1.EmployeeBasicInfo,
                cacheKey: employee.search,
                keyword: keyword,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
                fetchFunction: async () => {
                    return await employeeRepository_1.employeeRepository.findAllEmployee();
                },
            });
            return result;
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
                console.log(lastEmployee?.toJSON());
                let nextNumber = 1;
                if (lastEmployee && lastEmployee.employeeCode) {
                    const part = lastEmployee.employeeCode.split("-");
                    const lastNumber = parseInt(part[1], 10) || 0;
                    nextNumber = lastNumber + 1;
                }
                // Generate next employee code - format: PREFIX-XXX
                const prefix = companyInfo.employeeCode.toUpperCase();
                const nextCode = `${prefix}-${nextNumber.toString().padStart(3, "0")}`;
                console.log(nextCode);
                const newBasicInfo = await employeeRepository_1.employeeRepository.createEmployee(employeeBasicInfo_1.EmployeeBasicInfo, basicInfo, transaction);
                await employeeRepository_1.employeeRepository.createEmployee(employeeCompanyInfo_1.EmployeeCompanyInfo, { ...companyInfo, employeeId: newBasicInfo.employeeId, employeeCode: nextCode }, transaction);
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
                const employee = await employeeRepository_1.employeeRepository.findEmployeeByPk(employeeId, transaction);
                if (!employee) {
                    throw appError_1.AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
                }
                if (basicInfo) {
                    await employeeRepository_1.employeeRepository.updateEmployee(employee, basicInfo, transaction);
                }
                if (companyInfo && employee.companyInfo) {
                    await employeeRepository_1.employeeRepository.updateEmployee(employee.companyInfo, companyInfo, transaction);
                }
                else if (companyInfo) {
                    await employeeRepository_1.employeeRepository.createEmployee(employeeCompanyInfo_1.EmployeeCompanyInfo, { employeeId: employee.employeeId, ...companyInfo }, transaction);
                }
                const updatedEmployee = await employeeRepository_1.employeeRepository.findEmployeeById(employeeId);
                return { message: "Cập nhật nhân viên thành công", data: updatedEmployee };
            });
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteEmployee: async (employeeId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const employee = await employeeRepository_1.employeeRepository.findEmployeeByPk(employeeId);
                if (!employee) {
                    throw appError_1.AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
                }
                // Xóa bản ghi chính
                await employee.destroy({ transaction });
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
                const normalizedStatus = status.toLowerCase().trim();
                whereCondition["$companyInfo.status$"] = normalizedStatus;
            }
            else if (joinDate) {
                const start = new Date(joinDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                whereCondition["$companyInfo.joinDate$"] = { [sequelize_1.Op.between]: [start, end] };
            }
            const data = await employeeRepository_1.employeeRepository.findAllEmployee();
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
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