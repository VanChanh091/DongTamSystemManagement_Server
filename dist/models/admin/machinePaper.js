"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachinePaper = void 0;
exports.initMachinePaperModel = initMachinePaperModel;
const sequelize_1 = require("sequelize");
class MachinePaper extends sequelize_1.Model {
}
exports.MachinePaper = MachinePaper;
function initMachinePaperModel(sequelize) {
    MachinePaper.init({
        machineId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        machineName: { type: sequelize_1.DataTypes.STRING },
        timeChangeSize: { type: sequelize_1.DataTypes.INTEGER, allowNull: false }, //thời gian đổi cùng khổ
        timeChangeSameSize: { type: sequelize_1.DataTypes.INTEGER, allowNull: false }, //thời gian đổi khác khổ
        speed2Layer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        speed3Layer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        speed4Layer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        speed5Layer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        speed6Layer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        speed7Layer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        paperRollSpeed: { type: sequelize_1.DataTypes.INTEGER, allowNull: false }, //tốc độ quấn cuồn
        machinePerformance: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //hiệu suất hoạt động
    }, { sequelize, tableName: "MachinePapers", timestamps: true });
    return MachinePaper;
}
//# sourceMappingURL=machinePaper.js.map