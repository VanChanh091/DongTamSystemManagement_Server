"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryLog = void 0;
exports.initInventoryLogModel = initInventoryLogModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class InventoryLog extends sequelize_1.Model {
}
exports.InventoryLog = InventoryLog;
function initInventoryLogModel(sequelize) {
    InventoryLog.init({
        inventoryLogId: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        changeQty: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        balanceAfter: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        valueAfter: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        type: {
            type: sequelize_1.DataTypes.ENUM("INITIAL", "INBOUND", "OUTBOUND", "ADJUSTMENT_OUTBOUND", "ADJUSTMENT", "CANCEL_OUTBOUND", "LIQUIDATION", "TRANSFER"),
            allowNull: false,
        },
        //FK
        inventoryId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "inventory_logs",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["inventoryId"] },
            { fields: ["orderId"] },
            //composite indexes
            { fields: ["inventoryId", "createdAt"] },
        ],
    });
    return InventoryLog;
}
//# sourceMappingURL=inventoryLog.js.map