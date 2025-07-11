import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const MachinePaper = sequelize.define("MachinePaper", {
  machineId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  machineName: { type: DataTypes.STRING },
  timeChangeSize: { type: DataTypes.INTEGER, allowNull: false }, //thời gian đổi cùng khổ
  timeChangeSameSize: { type: DataTypes.INTEGER, allowNull: false }, //thời gian đổi khác khổ
  speed2Layer: { type: DataTypes.INTEGER, allowNull: false },
  speed3Layer: { type: DataTypes.INTEGER, allowNull: false },
  speed4Layer: { type: DataTypes.INTEGER, allowNull: false },
  speed5Layer: { type: DataTypes.INTEGER, allowNull: false },
  speed6Layer: { type: DataTypes.INTEGER, allowNull: false },
  speed7Layer: { type: DataTypes.INTEGER, allowNull: false },
  paperRollSpeed: { type: DataTypes.INTEGER, allowNull: false }, //tốc độ quấn cuồn
  machinePerformance: { type: DataTypes.DOUBLE, allowNull: false }, //hiệu suất hoạt động
});

export default MachinePaper;
