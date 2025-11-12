"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WasteNormPaper = void 0;
exports.initWasteNormPaperModel = initWasteNormPaperModel;
const sequelize_1 = require("sequelize");
class WasteNormPaper extends sequelize_1.Model {
}
exports.WasteNormPaper = WasteNormPaper;
function initWasteNormPaperModel(sequelize) {
    WasteNormPaper.init({
        wasteNormId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        waveCrest: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //giấy đầu sóng
        waveCrestSoft: { type: sequelize_1.DataTypes.DOUBLE }, //giấy đầu mềm
        lossInProcess: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //hao phí trong quá trình chạy
        lossInSheetingAndSlitting: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //hao phí xả tờ - chia khổ
        machineName: { type: sequelize_1.DataTypes.STRING },
    }, { sequelize, tableName: "WasteNorms", timestamps: true });
    return WasteNormPaper;
}
//# sourceMappingURL=wasteNormPaper.js.map