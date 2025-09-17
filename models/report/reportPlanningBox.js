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
  qtyProduced: { type: DataTypes.INTEGER },
  wasteLoss: { type: DataTypes.DOUBLE },
  shiftManagement: { type: DataTypes.STRING },
});

export default ReportPlanningBox;
