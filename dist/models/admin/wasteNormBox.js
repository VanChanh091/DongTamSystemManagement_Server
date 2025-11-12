"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WasteNormBox = void 0;
exports.initWasteNormBoxModel = initWasteNormBoxModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class WasteNormBox extends sequelize_1.Model {
}
exports.WasteNormBox = WasteNormBox;
function initWasteNormBoxModel(sequelize) {
    WasteNormBox.init({
        wasteBoxId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        colorNumberOnProduct: { type: sequelize_1.DataTypes.INTEGER },
        paperNumberOnProduct: { type: sequelize_1.DataTypes.INTEGER },
        totalLossOnTotalQty: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        machineName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, { sequelize, tableName: "WasteNormBoxes", timestamps: true });
    return WasteNormBox;
}
//# sourceMappingURL=wasteNormBox.js.map