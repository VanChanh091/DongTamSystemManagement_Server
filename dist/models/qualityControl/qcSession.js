"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QcSession = void 0;
exports.initQcSessionModel = initQcSessionModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class QcSession extends sequelize_1.Model {
}
exports.QcSession = QcSession;
function initQcSessionModel(sequelize) {
    QcSession.init({
        qcSessionId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        processType: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        checkedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        totalSample: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
        status: { type: sequelize_1.DataTypes.STRING, defaultValue: "checking" },
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER },
        planningBoxId: { type: sequelize_1.DataTypes.INTEGER },
    }, {
        sequelize,
        tableName: "QcSession",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningId"] },
            { fields: ["planningBoxId"] },
            //indexes
            { fields: ["createdAt"] },
        ],
    });
    return QcSession;
}
//# sourceMappingURL=qcSession.js.map