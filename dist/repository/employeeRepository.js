"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeRepository = void 0;
const sequelize_1 = require("sequelize");
const employeeBasicInfo_1 = require("../models/employee/employeeBasicInfo");
const employeeCompanyInfo_1 = require("../models/employee/employeeCompanyInfo");
exports.employeeRepository = {
    findEmployeeByPK: async (employeeId, transaction) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(employeeId, {
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    as: "companyInfo",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
            transaction,
        });
    },
    findEmployeeByPk: async (employeeId, transaction) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(employeeId, { transaction });
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
    findEmployeeByPage: async ({ page, pageSize, whereCondition = {}, }) => {
        const query = {
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    where: whereCondition,
                    as: "companyInfo",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
            order: [["employeeId", "ASC"]],
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await employeeBasicInfo_1.EmployeeBasicInfo.findAndCountAll(query);
    },
    getEmployeeByField: async (whereCondition) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    as: "companyInfo",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
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
    //find customer for meilisearch
    findEmployeeForMeili: async (employeeId, transaction) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(employeeId, {
            attributes: ["employeeId", "fullName", "phoneNumber"],
            include: [
                {
                    model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                    as: "companyInfo",
                    attributes: ["employeeCode", "status"],
                },
            ],
            transaction,
        });
    },
};
//# sourceMappingURL=employeeRepository.js.map