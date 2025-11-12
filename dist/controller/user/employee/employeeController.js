"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelEmployee = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeesByField = exports.getAllEmployees = void 0;
const sequelize_1 = require("sequelize");
const employeeBasicInfo_1 = require("../../../models/employee/employeeBasicInfo");
const employeeCompanyInfo_1 = require("../../../models/employee/employeeCompanyInfo");
const orderHelpers_1 = require("../../../utils/helper/modelHelper/orderHelpers");
const excelExporter_1 = require("../../../utils/helper/excelExporter");
const employeeRowAndColumn_1 = require("../../../utils/mapping/employeeRowAndColumn");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//get all
const getAllEmployees = async (req, res) => {
    const { page = 1, pageSize = 20, noPaging = false } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const noPagingMode = noPaging === "true";
    const { employee } = cacheManager_1.CacheManager.keys;
    const cacheKey = noPaging === "true" ? employee.all : employee.page(currentPage);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check(employeeBasicInfo_1.EmployeeBasicInfo, "employee");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearEmployee();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data Employees from Redis");
                const parsed = JSON.parse(cachedData);
                return res.status(200).json({ ...parsed, message: "Get all employees from cache" });
            }
        }
        let data, totalPages;
        const totalEmployees = await employeeBasicInfo_1.EmployeeBasicInfo.count();
        if (noPagingMode) {
            totalPages = 1;
            data = await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
                include: [
                    {
                        model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                        as: "companyInfo",
                        attributes: { exclude: ["createdAt", "updatedAt"] },
                    },
                ],
            });
        }
        else {
            totalPages = Math.ceil(totalEmployees / currentPageSize);
            data = await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
                include: [
                    {
                        model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                        as: "companyInfo",
                        attributes: { exclude: ["createdAt", "updatedAt"] },
                    },
                ],
                offset: (currentPage - 1) * currentPageSize,
                limit: currentPageSize,
                order: [
                    //lấy 3 số cuối -> ép chuỗi thành số để so sánh -> sort
                    [sequelize_1.Sequelize.literal("CAST(RIGHT(`companyInfo`.`employeeCode`, 3) AS UNSIGNED)"), "ASC"],
                ],
            });
        }
        const responseData = {
            message: "get all employees successfully",
            data,
            totalEmployees,
            totalPages,
            currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("get all employees failed:", error);
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getAllEmployees = getAllEmployees;
//get by field
const getEmployeesByField = async (req, res) => {
    const { field, keyword, page, pageSize } = req.query;
    const fieldMap = {
        employeeId: (employee) => employee.employeeId,
        fullName: (employee) => employee.fullName,
        phoneNumber: (employee) => employee.phoneNumber,
        employeeCode: (employee) => employee.companyInfo?.employeeCode,
        department: (employee) => employee.companyInfo.department,
        status: (employee) => employee.companyInfo.status,
    };
    const key = field;
    if (!fieldMap[key]) {
        return res.status(400).json({ message: "Invalid field parameter" });
    }
    const { employee } = cacheManager_1.CacheManager.keys;
    try {
        const result = await (0, orderHelpers_1.filterDataFromCache)({
            model: employeeBasicInfo_1.EmployeeBasicInfo,
            cacheKey: employee.search,
            keyword: keyword,
            getFieldValue: fieldMap[key],
            page,
            pageSize,
            message: `get all by ${field} from filtered cache`,
            fetchFunction: async () => {
                return await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    include: [
                        {
                            model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                            as: "companyInfo",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                });
            },
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error(`Failed to get employees by ${field}:`, error.message);
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getEmployeesByField = getEmployeesByField;
//add employee
const createEmployee = async (req, res) => {
    const { companyInfo, ...basicInfo } = req.body;
    const transaction = await employeeBasicInfo_1.EmployeeBasicInfo.sequelize?.transaction();
    try {
        const newBasicInfo = await employeeBasicInfo_1.EmployeeBasicInfo.create(basicInfo, { transaction });
        await employeeCompanyInfo_1.EmployeeCompanyInfo.create({
            employeeId: newBasicInfo.employeeId,
            ...companyInfo,
        }, { transaction });
        await transaction?.commit();
        const createdEmployee = await employeeBasicInfo_1.EmployeeBasicInfo.findOne({
            where: { employeeId: newBasicInfo.employeeId },
            include: [{ model: employeeCompanyInfo_1.EmployeeCompanyInfo, as: "companyInfo" }],
        });
        return res.status(201).json({
            message: "create new employee successfully",
            data: createdEmployee,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("create employee failed:", error.message);
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.createEmployee = createEmployee;
//update
const updateEmployee = async (req, res) => {
    const { employeeId } = req.query;
    const { companyInfo, ...basicInfo } = req.body;
    const employee_id = Number(employeeId);
    const transaction = await employeeBasicInfo_1.EmployeeBasicInfo.sequelize?.transaction();
    try {
        const employee = await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(employee_id, {
            include: [{ model: employeeCompanyInfo_1.EmployeeCompanyInfo, as: "companyInfo" }],
            transaction,
        });
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        if (basicInfo) {
            await employee.update(basicInfo, { transaction });
        }
        if (companyInfo && employee.companyInfo) {
            await employee.companyInfo.update(companyInfo, { transaction });
        }
        else if (companyInfo) {
            await employeeCompanyInfo_1.EmployeeCompanyInfo.create({ employeeId: employee.employeeId, ...companyInfo }, { transaction });
        }
        await transaction?.commit();
        const updatedEmployee = await employeeBasicInfo_1.EmployeeBasicInfo.findOne({
            where: { employeeId: employee_id },
            include: [{ model: employeeCompanyInfo_1.EmployeeCompanyInfo, as: "companyInfo" }],
        });
        return res.status(200).json({
            message: "Cập nhật nhân viên thành công",
            data: updatedEmployee,
        });
    }
    catch (error) {
        if (transaction)
            await transaction.rollback();
        console.error("update employees failed:", error);
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.updateEmployee = updateEmployee;
//delete
const deleteEmployee = async (req, res) => {
    const { employeeId } = req.query;
    const employee_id = Number(employeeId);
    const transaction = await employeeBasicInfo_1.EmployeeBasicInfo.sequelize?.transaction();
    try {
        const employee = await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(employee_id, {
            include: [{ model: employeeCompanyInfo_1.EmployeeCompanyInfo, as: "companyInfo" }],
            transaction,
        });
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        if (employee.companyInfo) {
            await employee.companyInfo.destroy({ transaction });
        }
        // Xóa bản ghi chính
        await employee.destroy({ transaction });
        await transaction?.commit();
        return res.status(200).json({
            message: "delete employee successfully",
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("delete employees failed:", error.message);
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.deleteEmployee = deleteEmployee;
//export excel
const exportExcelEmployee = async (req, res) => {
    const { status, joinDate, all = false } = req.body;
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
        const data = await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    where: whereCondition,
                    as: "companyInfo",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
        });
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
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.exportExcelEmployee = exportExcelEmployee;
//# sourceMappingURL=employeeController.js.map