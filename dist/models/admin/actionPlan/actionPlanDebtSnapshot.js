"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionPlanDebtSnapshot = void 0;
exports.initActionPlanDebtSnapshotModel = initActionPlanDebtSnapshotModel;
const sequelize_1 = require("sequelize");
class ActionPlanDebtSnapshot extends sequelize_1.Model {
}
exports.ActionPlanDebtSnapshot = ActionPlanDebtSnapshot;
function initActionPlanDebtSnapshotModel(sequelize) {
    ActionPlanDebtSnapshot.init({
        snapshotId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        year: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        month: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        closingDay: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        snapshotDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
        totalDebt: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        overdueDebt: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        onTimeDebt: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        onTimeRate: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        customerCount: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    }, {
        sequelize,
        tableName: "action_plan_debt_snapshots",
        timestamps: true,
        indexes: [{ unique: true, fields: ["year", "month", "closingDay"] }],
    });
    return ActionPlanDebtSnapshot;
}
//# sourceMappingURL=actionPlanDebtSnapshot.js.map