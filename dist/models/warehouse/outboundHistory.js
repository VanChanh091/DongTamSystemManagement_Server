"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundHistory = void 0;
exports.initOutboundHistoryModel = initOutboundHistoryModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class OutboundHistory extends sequelize_1.Model {
}
exports.OutboundHistory = OutboundHistory;
function initOutboundHistoryModel(sequelize) {
    OutboundHistory.init({
        outboundId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dateOutbound: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        outboundSlipCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        totalPriceOrder: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        totalPriceVAT: { type: sequelize_1.DataTypes.DOUBLE },
        totalPricePayment: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        totalOutboundQty: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "OutboundHistory",
        timestamps: true,
        indexes: [
            //indexes
            { fields: ["dateOutbound"] },
        ],
    });
    return OutboundHistory;
}
//# sourceMappingURL=outboundHistory.js.map