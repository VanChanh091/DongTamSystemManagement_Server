"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundDetail = void 0;
exports.initOutboundDetailModel = initOutboundDetailModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class OutboundDetail extends sequelize_1.Model {
}
exports.OutboundDetail = OutboundDetail;
function initOutboundDetailModel(sequelize) {
    OutboundDetail.init({
        outboundDetailId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        outboundQty: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        price: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        totalPriceOutbound: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        deliveredQty: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        outboundId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "OutboundDetail",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            { fields: ["outboundId"] },
            //indexes
            { fields: ["orderId", "outboundId"] },
        ],
    });
    return OutboundDetail;
}
//# sourceMappingURL=outboundDetail.js.map