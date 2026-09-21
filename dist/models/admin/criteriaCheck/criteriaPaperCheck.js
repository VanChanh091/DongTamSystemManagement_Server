"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriteriaPaperCheck = void 0;
exports.initCriteriaPaperCheckModel = initCriteriaPaperCheckModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class CriteriaPaperCheck extends sequelize_1.Model {
}
exports.CriteriaPaperCheck = CriteriaPaperCheck;
function initCriteriaPaperCheckModel(sequelize) {
    CriteriaPaperCheck.init({
        criteriaPaperId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        criteriaPaperCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        criteriaPaperName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        isRequired: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
        variance: { type: sequelize_1.DataTypes.DOUBLE }, //sai số
    }, {
        sequelize,
        tableName: "criteria_paper_check",
        timestamps: true,
    });
    return CriteriaPaperCheck;
}
//# sourceMappingURL=criteriaPaperCheck.js.map