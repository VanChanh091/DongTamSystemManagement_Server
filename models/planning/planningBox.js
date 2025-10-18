import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const PlanningBox = sequelize.define(
  "PlanningBox",
  {
    planningBoxId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    qtyPaper: { type: DataTypes.INTEGER },

    day: { type: DataTypes.STRING },
    matE: { type: DataTypes.STRING },
    matB: { type: DataTypes.STRING },
    matC: { type: DataTypes.STRING },
    songE: { type: DataTypes.STRING },
    songB: { type: DataTypes.STRING },
    songC: { type: DataTypes.STRING },
    songE2: { type: DataTypes.STRING },
    length: { type: DataTypes.DOUBLE, allowNull: false },
    size: { type: DataTypes.DOUBLE, allowNull: false },

    hasIn: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasCanLan: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasBe: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasXa: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasDan: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasCatKhe: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasCanMang: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasDongGhim: { type: DataTypes.BOOLEAN, defaultValue: false },

    hasOverFlow: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { timestamps: true }
);

export default PlanningBox;
