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
            order: [["employeeId", "ASC"]],
        });
    },
    findEmployeeByPosition: async () => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
            attributes: ["employeeId", "fullName"],
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    as: "companyInfo",
                    attributes: ["position", "department"],
                    where: {
                        [sequelize_1.Op.and]: [
                            (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("companyInfo.position")), {
                                [sequelize_1.Op.like]: "%trưởng máy%",
                            }),
                            { status: "Đang làm việc" },
                        ],
                    },
                },
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