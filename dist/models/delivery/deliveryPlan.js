"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryPlan = void 0;
exports.initDeliveryPlanModel = initDeliveryPlanModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class DeliveryPlan extends sequelize_1.Model {
}
exports.DeliveryPlan = DeliveryPlan;
function initDeliveryPlanModel(sequelize) {
    DeliveryPlan.init({
        deliveryId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        deliveryDate: { type: sequelize_1.DataTypes.DATE, unique: true },
        status: {
            type: sequelize_1.DataTypes.ENUM("none", "planned", "cancelled", "completed"),
            allowNull: false,
            defaultValue: "none",
        },
    }, {
        sequelize,
        tableName: "DeliveryPlan",
        timestamps: true,
        indexes: [{ fields: ["deliveryDate"] }, { fields: ["status"] }],
    });
    return DeliveryPlan;
}
//# sourceMappingURL=deliveryPlan.js.map