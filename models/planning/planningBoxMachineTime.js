import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const PlanningBoxTime = sequelize.define("PlanningBoxTime", {
  boxTimeId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  timeRunning: { type: DataTypes.TIME },
  dayStart: { type: DataTypes.DATE },
  dayCompleted: {
    type: DataTypes.DATE,
    get() {
      const rawValue = this.getDataValue("dayCompleted");
      if (!rawValue) return null;
      return new Date(
        rawValue.getTime() - rawValue.getTimezoneOffset() * 60000
      ).toISOString();
    },
  },
  wasteBox: { type: DataTypes.DOUBLE },
  rpWasteLoss: { type: DataTypes.DOUBLE },
  qtyProduced: { type: DataTypes.INTEGER },
  machine: {
    type: DataTypes.ENUM(
      "Máy In",
      "Máy Bế",
      "Máy Xả",
      "Máy Dán",
      "Máy Cắt Khe",
      "Máy Cán Màng",
      "Máy Đóng Ghim"
    ),
    allowNull: false,
  },
  shiftManagement: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM("planning", "lackOfQty", "complete"),
    allowNull: false,
    defaultValue: "planning",
  },
  sortPlanning: { type: DataTypes.INTEGER },
});

export default PlanningBoxTime;
