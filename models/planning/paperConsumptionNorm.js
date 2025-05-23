import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const PaperConsumptionNorm = sequelize.define(
  "PaperConsumptionNorm",
  {
    quantitativePaperId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    day: { type: DataTypes.INTEGER },
    songE: { type: DataTypes.INTEGER },
    matE: { type: DataTypes.INTEGER },
    songB: { type: DataTypes.INTEGER },
    matB: { type: DataTypes.INTEGER },
    songC: { type: DataTypes.INTEGER },
    matC: { type: DataTypes.INTEGER },
    weight: { type: DataTypes.DOUBLE, allowNull: false },
    totalConsumption: { type: DataTypes.DOUBLE, allowNull: false },
    DmDay: { type: DataTypes.DOUBLE, allowNull: false },
    DmSongC: { type: DataTypes.DOUBLE, allowNull: false },
    DmSongB: { type: DataTypes.DOUBLE, allowNull: false },
    DmSongE: { type: DataTypes.DOUBLE, allowNull: false },
    DmDao: { type: DataTypes.DOUBLE, allowNull: false },
  },
  { timestamps: true }
);

export default PaperConsumptionNorm;
