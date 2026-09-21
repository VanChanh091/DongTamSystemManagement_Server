"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriteriaBoxCheck = void 0;
exports.initCriteriaBoxCheckModel = initCriteriaBoxCheckModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class CriteriaBoxCheck extends sequelize_1.Model {
}
exports.CriteriaBoxCheck = CriteriaBoxCheck;
function initCriteriaBoxCheckModel(sequelize) {
    CriteriaBoxCheck.init({
        criteriaBoxId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        criteriaBoxCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        criteriaBoxName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        variance: { type: sequelize_1.DataTypes.DOUBLE }, //sai số
        machine: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "criteria_box_check",
        timestamps: true,
    });
    return CriteriaBoxCheck;
}
//# sourceMappingURL=criteriaBoxCheck.js.map