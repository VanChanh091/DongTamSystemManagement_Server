"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningBox = void 0;
exports.initPlanningBoxModel = initPlanningBoxModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PlanningBox extends sequelize_1.Model {
}
exports.PlanningBox = PlanningBox;
function initPlanningBoxModel(sequelize) {
    PlanningBox.init({
        planningBoxId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        qtyPaper: { type: sequelize_1.DataTypes.INTEGER },
        day: { type: sequelize_1.DataTypes.STRING },
        matE: { type: sequelize_1.DataTypes.STRING },
        matB: { type: sequelize_1.DataTypes.STRING },
        matC: { type: sequelize_1.DataTypes.STRING },
        matE2: { type: sequelize_1.DataTypes.STRING },
        songE: { type: sequelize_1.DataTypes.STRING },
        songB: { type: sequelize_1.DataTypes.STRING },
        songC: { type: sequelize_1.DataTypes.STRING },
        songE2: { type: sequelize_1.DataTypes.STRING },
        length: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        size: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        hasIn: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasCanLan: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasBe: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasXa: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasDan: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasCatKhe: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasCanMang: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasDongGhim: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        hasOverFlow: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        statusRequest: {
            type: sequelize_1.DataTypes.ENUM("none", "requested", "inbounded", "finalize"),
            defaultValue: "none",
        },
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        planningId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "PlanningBoxes",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            { fields: ["planningId"], unique: true },
            //indexes
            { fields: ["orderId", "planningId"] },
        ],
    });
    return PlanningBox;
}
//# sourceMappingURL=planningBox.js.map