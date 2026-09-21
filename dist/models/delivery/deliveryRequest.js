"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryRequest = void 0;
exports.initDeliveryRequestModel = initDeliveryRequestModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class DeliveryRequest extends sequelize_1.Model {
}
exports.DeliveryRequest = DeliveryRequest;
function initDeliveryRequestModel(sequelize) {
    DeliveryRequest.init({
        requestId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        qtyRegistered: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        volume: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        note: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("requested", "partial", "scheduled", "cancelled"),
            allowNull: false,
            defaultValue: "requested",
        },
        //FK
        userId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        planningId: { type: sequelize_1.DataTypes.INTEGER },
        orderId: { type: sequelize_1.DataTypes.STRING },
    }, {
        sequelize,
        tableName: "delivery_requests",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["userId"] },
            { fields: ["planningId"] },
            { fields: ["orderId"] },
            //indexes
            { fields: ["status"] },
        ],
    });
    return DeliveryRequest;
}
//# sourceMappingURL=deliveryRequest.js.map