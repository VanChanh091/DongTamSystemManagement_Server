"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QcSampleResult = void 0;
exports.initQcSamepleResultModel = initQcSamepleResultModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class QcSampleResult extends sequelize_1.Model {
}
exports.QcSampleResult = QcSampleResult;
function initQcSamepleResultModel(sequelize) {
    QcSampleResult.init({
        qcResultId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        sampleIndex: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        checklist: { type: sequelize_1.DataTypes.JSON, allowNull: false },
        hasFail: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        //FK
        qcSessionId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "QcSampleResult",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["qcSessionId"] },
            //indexes
            { fields: ["sampleIndex"] },
            { fields: ["qcSessionId", "sampleIndex"] },
        ],
    });
    return QcSampleResult;
}
//# sourceMappingURL=qcSampleResult.js.map