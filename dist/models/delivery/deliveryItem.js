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
        idxOrder: { type: sequelize_1.DataTypes.INTEGER },
        recipient: { type: sequelize_1.DataTypes.STRING },
        dayRequested: { type: sequelize_1.DataTypes.DATE },
        dayCompleted: {
            type: sequelize_1.DataTypes.DATE,
            // get() {
            //   const rawValue = this.getDataValue("dayCompleted");
            //   if (!rawValue) return null;
            //   return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            // },
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("none", "planned", "requested", "prepared", "outbound", "cancelled", "completed"),
            allowNull: false,
            defaultValue: "none",
        },
        licensePlate: { type: sequelize_1.DataTypes.STRING },
        //FK
        deliveryId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        requestId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        vehicleId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "delivery_items",
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