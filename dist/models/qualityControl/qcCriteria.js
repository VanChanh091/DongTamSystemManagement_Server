"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QcCriteria = void 0;
exports.initQcCriteriaModel = initQcCriteriaModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class QcCriteria extends sequelize_1.Model {
}
exports.QcCriteria = QcCriteria;
function initQcCriteriaModel(sequelize) {
    QcCriteria.init({
        qcCriteriaId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        processType: { type: sequelize_1.DataTypes.ENUM("paper", "box"), allowNull: false },
        criteriaCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        criteriaName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        isRequired: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
    }, { sequelize, tableName: "QcCriteria", timestamps: true });
    return QcCriteria;
}
//# sourceMappingURL=qcCriteria.js.map