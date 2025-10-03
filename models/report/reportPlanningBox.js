import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const ReportPlanningBox = sequelize.define("ReportPlanningBox", {
  reportBoxId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  dayReport: {
    type: DataTypes.DATE,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue("dayReport");
      if (!rawValue) return null;
      return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
    },
  },
  qtyProduced: { type: DataTypes.INTEGER, allowNull: false },
  lackOfQty: { type: DataTypes.INTEGER, allowNull: false },
  wasteLoss: { type: DataTypes.DOUBLE, allowNull: false },
  shiftManagement: { type: DataTypes.STRING, allowNull: false },
  machine: { type: DataTypes.STRING, allowNull: false },
});

export default ReportPlanningBox;
