"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaveCrestCoefficient = void 0;
exports.initWaveCrestCoefficientModel = initWaveCrestCoefficientModel;
const sequelize_1 = require("sequelize");
class WaveCrestCoefficient extends sequelize_1.Model {
}
exports.WaveCrestCoefficient = WaveCrestCoefficient;
function initWaveCrestCoefficientModel(sequelize) {
    WaveCrestCoefficient.init({
        waveCrestCoefficientId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        fluteE_1: { type: sequelize_1.DataTypes.DOUBLE },
        fluteE_2: { type: sequelize_1.DataTypes.DOUBLE },
        fluteB: { type: sequelize_1.DataTypes.DOUBLE },
        fluteC: { type: sequelize_1.DataTypes.DOUBLE },
        machineName: { type: sequelize_1.DataTypes.STRING },
    }, { sequelize, tableName: "WaveCrestCoefficients", timestamps: true });
    return WaveCrestCoefficient;
}
//# sourceMappingURL=waveCrestCoefficient.js.map