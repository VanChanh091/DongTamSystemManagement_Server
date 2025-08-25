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
    overflowDayCompleted: {
      type: DataTypes.DATE,
      get() {
        const rawValue = this.getDataValue("overflowDayCompleted");
        if (!rawValue) return null;
        return new Date(
          rawValue.getTime() - rawValue.getTimezoneOffset() * 60000
        ).toISOString();
      },
    },
    overflowTimeRunning: { type: DataTypes.TIME },
    machine: { type: DataTypes.STRING },
    status: {
      type: DataTypes.ENUM("planning", "lackOfQty", "complete"),
      allowNull: false,
      defaultValue: "planning",
    },
  },
  { timestamps: true }
);

export default timeOverflowPlanning;
