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
    weight: { type: DataTypes.DOUBLE },
    totalConsumption: { type: DataTypes.DOUBLE },
    DmDay: { type: DataTypes.DOUBLE },
    DmSongC: { type: DataTypes.DOUBLE },
    DmSongB: { type: DataTypes.DOUBLE },
    DmSongE: { type: DataTypes.DOUBLE },
    DmDao: { type: DataTypes.DOUBLE },
  },
  { timestamps: true }
);

export default PaperConsumptionNorm;
