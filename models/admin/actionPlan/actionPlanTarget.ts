import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ActionPlanTargetAttributes {
  targetId: number;
  year: number; // Ví dụ: 2026
  month: number; // 1 đến 12

  // 1. Kế hoạch bán hàng
  targetRevenue: number; // Doanh số mục tiêu (VNĐ)

  // 2. Hoạt động thu nợ
  targetDebtOnTimeRate: number; // Mục tiêu tỷ lệ đúng hạn (%)

  // 3. Hoạt động kế hoạch
  targetOrderOnTimeRate: number; // Mục tiêu đơn đúng hạn (%)

  // 4. Hoạt động sản xuất
  targetProductionCompletionRate: number; // Mục tiêu hoàn thành SX (%)

  note?: string | null;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ActionPlanTargetCreationAttributes = Optional<
  ActionPlanTargetAttributes,
  "targetId" | "createdAt" | "updatedAt"
>;

export class ActionPlanTarget
  extends Model<ActionPlanTargetAttributes, ActionPlanTargetCreationAttributes>
  implements ActionPlanTargetAttributes
{
  declare targetId: number;
  declare year: number;
  declare month: number;
  declare targetRevenue: number;
  declare targetDebtOnTimeRate: number;
  declare targetOrderOnTimeRate: number;
  declare targetProductionCompletionRate: number;

  declare note?: string | null;
  declare updatedBy?: string | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initActionPlanTargetModel(sequelize: Sequelize): typeof ActionPlanTarget {
  ActionPlanTarget.init(
    {
      targetId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      year: { type: DataTypes.INTEGER, allowNull: false },
      month: { type: DataTypes.INTEGER, allowNull: false },
      targetRevenue: { type: DataTypes.DOUBLE, defaultValue: 0 },
      targetDebtOnTimeRate: { type: DataTypes.DOUBLE, defaultValue: 0 },
      targetOrderOnTimeRate: { type: DataTypes.DOUBLE, defaultValue: 0 },
      targetProductionCompletionRate: { type: DataTypes.DOUBLE, defaultValue: 0 },
      note: { type: DataTypes.STRING, allowNull: true },
      updatedBy: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      tableName: "action_plan_targets",
      timestamps: true,
      indexes: [{ unique: true, fields: ["year", "month"] }],
    },
  );
  return ActionPlanTarget;
}
