"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeCompanyInfo = void 0;
exports.initEmployeeCompanyInfoModel = initEmployeeCompanyInfoModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class EmployeeCompanyInfo extends sequelize_1.Model {
}
exports.EmployeeCompanyInfo = EmployeeCompanyInfo;
function initEmployeeCompanyInfoModel(sequelize) {
    EmployeeCompanyInfo.init({
        companyInfoId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employeeCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        joinDate: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        department: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        position: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        emergencyPhone: { type: sequelize_1.DataTypes.STRING },
        emergencyContact: { type: sequelize_1.DataTypes.STRING },
        status: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        //FK
        employeeId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "EmployeeCompanyInfos",
        timestamps: true,
        indexes: [{ fields: ["employeeId"] }],
    });
    return EmployeeCompanyInfo;
}
//# sourceMappingURL=employeeCompanyInfo.js.map