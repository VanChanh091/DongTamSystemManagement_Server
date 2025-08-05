import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const WasteNormPaper = sequelize.define("WasteNorm", {
  wasteNormId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  waveCrest: { type: DataTypes.DOUBLE, allowNull: false }, //giấy đầu sóng
  waveCrestSoft: { type: DataTypes.DOUBLE }, //giấy đầu mềm
  lossInProcess: { type: DataTypes.DOUBLE, allowNull: false }, //hao phí trong quá trình chạy
  lossInSheetingAndSlitting: { type: DataTypes.DOUBLE, allowNull: false }, //hao phí xả tờ - chia khổ
  machineName: { type: DataTypes.STRING },
});

export default WasteNormPaper;
