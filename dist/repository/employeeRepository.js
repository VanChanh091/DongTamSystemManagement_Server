"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeRepository = void 0;
const sequelize_1 = require("sequelize");
const employeeBasicInfo_1 = require("../models/employee/employeeBasicInfo");
const employeeCompanyInfo_1 = require("../models/employee/employeeCompanyInfo");
exports.employeeRepository = {
    employeeCount: async () => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.count();
    },
    findEmployeeById: async (employeeId) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findOne({
            where: { employeeId: employeeId },
            include: [{ model: employeeCompanyInfo_1.EmployeeCompanyInfo, as: "companyInfo" }],
        });
    },
    findEmployeeByPk: async (employeeId, transaction) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(employeeId, {
            include: [{ model: employeeCompanyInfo_1.EmployeeCompanyInfo, as: "companyInfo" }],
            transaction,
        });
    },
    findAllEmployee: async () => {
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
    findEmployeeByPage: async (page, pageSize) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    as: "companyInfo",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
            offset: (page - 1) * pageSize,
            limit: pageSize,
            order: [
                //lấy 3 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`companyInfo`.`employeeCode`, 3) AS UNSIGNED)"), "ASC"],
            ],
        });
    },
    createEmployee: async (model, data, transaction) => {
        return await model.create(data, { transaction });
    },
    updateEmployee: async (employee, data, transaction) => {
        return await employee.update(data, { transaction });
    },
    deleteEmployee: async (employee, transaction) => {
        return await employee.destroy(transaction);
    },
    exportExcelEmpl: async (whereCondition = {}) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
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
    },
};
//# sourceMappingURL=employeeRepository.js.map