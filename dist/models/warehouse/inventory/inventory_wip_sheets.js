"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryWipSheets = void 0;
exports.initInventoryWipSheetsModel = initInventoryWipSheetsModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class InventoryWipSheets extends sequelize_1.Model {
}
exports.InventoryWipSheets = InventoryWipSheets;
function initInventoryWipSheetsModel(sequelize) {
    InventoryWipSheets.init({
        wipSheetId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        qtyProduced: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        qtyRemaining: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        unitPrice: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        totalPrice: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        inboundedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        status: {
            type: sequelize_1.DataTypes.ENUM("in_wip", "completed", "canceled"),
            allowNull: false,
            defaultValue: "in_wip",
        },
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "inventory_wip_sheets",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            { fields: ["planningId"] },
            //indexes
            { fields: ["status", "createdAt"] },
        ],
    });
    return InventoryWipSheets;
}
//# sourceMappingURL=inventory_wip_sheets.js.map