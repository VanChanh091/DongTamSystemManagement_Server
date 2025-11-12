"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeBasicInfo = void 0;
exports.initEmployeeBasicInfoModel = initEmployeeBasicInfoModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class EmployeeBasicInfo extends sequelize_1.Model {
}
exports.EmployeeBasicInfo = EmployeeBasicInfo;
function initEmployeeBasicInfoModel(sequelize) {
    EmployeeBasicInfo.init({
        employeeId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        fullName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        gender: { type: sequelize_1.DataTypes.ENUM("Nam", "Nữ", "Khác"), allowNull: false },
        birthday: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        birthPlace: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        homeTown: { type: sequelize_1.DataTypes.STRING },
        educationLevel: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        phoneNumber: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        educationSystem: { type: sequelize_1.DataTypes.STRING },
        major: { type: sequelize_1.DataTypes.STRING },
        citizenId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        citizenIssuedDate: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        citizenIssuedPlace: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        permanentAddress: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        temporaryAddress: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        ethnicity: { type: sequelize_1.DataTypes.STRING, allowNull: false }, //dân tộc
    }, { sequelize, tableName: "EmployeeBasicInfos", timestamps: true });
    return EmployeeBasicInfo;
}
//# sourceMappingURL=employeeBasicInfo.js.map