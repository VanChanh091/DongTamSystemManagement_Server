"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryTransfers = void 0;
exports.initInventoryTransfersModel = initInventoryTransfersModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class InventoryTransfers extends sequelize_1.Model {
}
exports.InventoryTransfers = InventoryTransfers;
function initInventoryTransfersModel(sequelize) {
    InventoryTransfers.init({
        transferId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        sourceId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        targetId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        qtyTransfers: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        reason: { type: sequelize_1.DataTypes.STRING },
        transferBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        //FK
        inventoryId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "inventory_transfers",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["inventoryId"] },
            // indexes
            // { fields: ["qtyInventory"] },
        ],
    });
    return InventoryTransfers;
}
//# sourceMappingURL=inventoryTransfers.js.map