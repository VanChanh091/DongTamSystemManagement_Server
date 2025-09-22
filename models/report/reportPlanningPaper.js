import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const ReportPlanningPaper = sequelize.define("ReportPlanningPaper", {
  reportPaperId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
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
  qtyWasteNorm: { type: DataTypes.DOUBLE, allowNull: false },
  shiftProduction: { type: DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3") },
  shiftManagement: { type: DataTypes.STRING, allowNull: false },
});

export default ReportPlanningPaper;
