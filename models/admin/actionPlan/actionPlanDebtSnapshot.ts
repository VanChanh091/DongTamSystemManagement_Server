import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ActionPlanDebtSnapshotAttributes {
  snapshotId: number;
  year: number;
  month: number;
  closingDay: number; // 1 hoặc 15
  snapshotDate: Date; // Ngày chốt thực tế

  totalDebt: number; // Tổng nợ
  overdueDebt: number; // Nợ quá hạn
  onTimeDebt: number; // Nợ trong hạn = totalDebt - overdueDebt
  onTimeRate: number; // Tỷ lệ đúng hạn (%) = (onTimeDebt / totalDebt) * 100

  customerCount: number; // Số lượng khách hàng
  createdAt?: Date;
  updatedAt?: Date;
}

export type ActionPlanDebtSnapshotCreationAttributes = Optional<
  ActionPlanDebtSnapshotAttributes,
  "snapshotId" | "createdAt" | "updatedAt"
>;

export class ActionPlanDebtSnapshot
  extends Model<ActionPlanDebtSnapshotAttributes, ActionPlanDebtSnapshotCreationAttributes>
  implements ActionPlanDebtSnapshotAttributes
{
  declare snapshotId: number;
  declare year: number;
  declare month: number;
  declare closingDay: number;
  declare snapshotDate: Date;
  declare totalDebt: number;
  declare overdueDebt: number;
  declare onTimeDebt: number;
  declare onTimeRate: number;
  declare customerCount: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initActionPlanDebtSnapshotModel(
  sequelize: Sequelize,
): typeof ActionPlanDebtSnapshot {
  ActionPlanDebtSnapshot.init(
    {
      snapshotId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      year: { type: DataTypes.INTEGER, allowNull: false },
      month: { type: DataTypes.INTEGER, allowNull: false },
      closingDay: { type: DataTypes.INTEGER, allowNull: false },
      snapshotDate: { type: DataTypes.DATEONLY, allowNull: false },
      totalDebt: { type: DataTypes.DOUBLE, defaultValue: 0 },
      overdueDebt: { type: DataTypes.DOUBLE, defaultValue: 0 },
      onTimeDebt: { type: DataTypes.DOUBLE, defaultValue: 0 },
      onTimeRate: { type: DataTypes.DOUBLE, defaultValue: 0 },
      customerCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
      sequelize,
      tableName: "action_plan_debt_snapshots",
      timestamps: true,
      indexes: [{ unique: true, fields: ["year", "month", "closingDay"] }],
    },
  );
  return ActionPlanDebtSnapshot;
}
