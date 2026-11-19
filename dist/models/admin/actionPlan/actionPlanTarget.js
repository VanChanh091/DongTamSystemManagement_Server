"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionPlanTarget = void 0;
exports.initActionPlanTargetModel = initActionPlanTargetModel;
const sequelize_1 = require("sequelize");
class ActionPlanTarget extends sequelize_1.Model {
}
exports.ActionPlanTarget = ActionPlanTarget;
function initActionPlanTargetModel(sequelize) {
    ActionPlanTarget.init({
        targetId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        year: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        month: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        targetRevenue: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        targetDebtOnTimeRate: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        targetOrderOnTimeRate: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        targetProductionCompletionRate: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        note: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        updatedBy: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    }, {
        sequelize,
        tableName: "action_plan_targets",
        timestamps: true,
        indexes: [{ unique: true, fields: ["year", "month"] }],
    });
    return ActionPlanTarget;
}
//# sourceMappingURL=actionPlanTarget.js.map