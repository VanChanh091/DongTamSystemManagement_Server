"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineBox = void 0;
exports.initMachineBoxModel = initMachineBoxModel;
const sequelize_1 = require("sequelize");
class MachineBox extends sequelize_1.Model {
}
exports.MachineBox = MachineBox;
function initMachineBoxModel(sequelize) {
    MachineBox.init({
        machineId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        timeToProduct: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        speedOfMachine: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        machineName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, { sequelize, tableName: "MachineBoxes", timestamps: true });
    return MachineBox;
}
//# sourceMappingURL=machineBox.js.map