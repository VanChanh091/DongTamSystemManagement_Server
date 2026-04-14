"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidationInventory = void 0;
exports.initLiquidationInventoryModel = initLiquidationInventoryModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class LiquidationInventory extends sequelize_1.Model {
}
exports.LiquidationInventory = LiquidationInventory;
function initLiquidationInventoryModel(sequelize) {
    LiquidationInventory.init({
        liquidationId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        qtyTransferred: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        qtySold: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        qtyRemaining: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        liquidationValue: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        reason: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "selling", "completed", "cancelled"),
            allowNull: false,
            defaultValue: "pending",
        },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        inventoryId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "LiquidationInventory",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            { fields: ["inventoryId"] },
        ],
    });
    return LiquidationInventory;
}
//# sourceMappingURL=liquidationInventory.js.map