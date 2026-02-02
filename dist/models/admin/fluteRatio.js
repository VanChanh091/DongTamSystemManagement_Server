"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FluteRatio = void 0;
exports.initFluteRatioCoefficientModel = initFluteRatioCoefficientModel;
const sequelize_1 = require("sequelize");
class FluteRatio extends sequelize_1.Model {
}
exports.FluteRatio = FluteRatio;
function initFluteRatioCoefficientModel(sequelize) {
    FluteRatio.init({
        fluteRatioId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        fluteName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        ratio: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
    }, { sequelize, tableName: "fluteRatio", timestamps: true });
    return FluteRatio;
}
//# sourceMappingURL=fluteRatio.js.map