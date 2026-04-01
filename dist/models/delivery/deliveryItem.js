"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryItem = void 0;
exports.initDeliveryItemModel = initDeliveryItemModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class DeliveryItem extends sequelize_1.Model {
}
exports.DeliveryItem = DeliveryItem;
function initDeliveryItemModel(sequelize) {
    DeliveryItem.init({
        deliveryItemId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        sequence: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        note: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("none", "planned", "requested", "prepared", "cancelled", "completed"),
            allowNull: false,
            defaultValue: "none",
        },
        //FK
        deliveryId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        requestId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        vehicleId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "DeliveryItem",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["deliveryId"] },
            { fields: ["requestId"] },
            { fields: ["vehicleId"] },
            //indexes
            { fields: ["deliveryId", "status"] },
        ],
    });
    return DeliveryItem;
}
//# sourceMappingURL=deliveryItem.js.map