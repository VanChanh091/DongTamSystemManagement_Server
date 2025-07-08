import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const timeOverflowPlanning = sequelize.define(
  "timeOverflowPlanning",
  {
    overflowId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    overflowDayStart: { type: DataTypes.DATE },
    overflowTimeRunning: { type: DataTypes.TIME },
    status: {
      type: DataTypes.ENUM("planning", "complete"),
      allowNull: false,
      defaultValue: "planning",
    },
    sortPlanning: { type: DataTypes.INTEGER },
  },
  { timestamps: true }
);

export default timeOverflowPlanning;
