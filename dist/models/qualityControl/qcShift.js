"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QcShift = void 0;
exports.initQcShiftModel = initQcShiftModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class QcShift extends sequelize_1.Model {
}
exports.QcShift = QcShift;
function initQcShiftModel(sequelize) {
    QcShift.init({
        qcShiftId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        startedAt: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("startedAt");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        endedAt: {
            type: sequelize_1.DataTypes.DATE,
            get() {
                const rawValue = this.getDataValue("endedAt");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        isActive: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        //FK
        userId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "qc_shifts",
        timestamps: true,
        indexes: [{ fields: ["userId"] }, { fields: ["isActive", "userId"] }],
    });
    return QcShift;
}
//# sourceMappingURL=qcShift.js.map