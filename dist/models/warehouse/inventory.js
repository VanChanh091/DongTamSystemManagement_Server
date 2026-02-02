"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inventory = void 0;
exports.initInventoryModel = initInventoryModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Inventory extends sequelize_1.Model {
}
exports.Inventory = Inventory;
function initInventoryModel(sequelize) {
    Inventory.init({
        inventoryId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        totalQtyInbound: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        totalQtyOutbound: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        qtyInventory: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        valueInventory: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false, unique: true },
    }, {
        sequelize,
        tableName: "Inventory",
        timestamps: true,
        indexes: [
            //FK
            { unique: true, fields: ["orderId"] },
            //indexes
            { fields: ["qtyInventory"] },
        ],
    });
    return Inventory;
}
//# sourceMappingURL=inventory.js.map