"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundHistory = void 0;
exports.initInboundHistoryModel = initInboundHistoryModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class InboundHistory extends sequelize_1.Model {
}
exports.InboundHistory = InboundHistory;
function initInboundHistoryModel(sequelize) {
    InboundHistory.init({
        inboundId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dateInbound: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        qtyPaper: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        qtyInbound: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        planningId: { type: sequelize_1.DataTypes.INTEGER },
        planningBoxId: { type: sequelize_1.DataTypes.INTEGER },
        qcSessionId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "InboundHistory",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            { fields: ["planningId"] },
            { fields: ["planningBoxId"] },
            { fields: ["qcSessionId"] },
            //indexes
            { fields: ["dateInbound"] },
            { fields: ["qtyInbound"] },
        ],
    });
    return InboundHistory;
}
//# sourceMappingURL=inboundHistory.js.map