import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const ReportProduction = sequelize.define("ReportProduction", {
  reportProdId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  qtyActually: { type: DataTypes.INTEGER, allowNull: false },
  qtyWasteNorm: { type: DataTypes.DOUBLE, allowNull: false },
  dayCompleted: { type: DataTypes.DATE, allowNull: false },
  shiftProduction: {
    type: DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"),
    allowNull: false,
  },
  shiftManagement: { type: DataTypes.STRING, allowNull: false },
  note: { type: DataTypes.STRING },
});

export default ReportProduction;
