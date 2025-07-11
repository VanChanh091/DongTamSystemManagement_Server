import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const WaveCrestCoefficient = sequelize.define("WaveCrestCoefficient", {
  waveCrestCoefficientId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fluteE_1: { type: DataTypes.DOUBLE },
  fluteE_2: { type: DataTypes.DOUBLE },
  fluteB: { type: DataTypes.DOUBLE },
  fluteC: { type: DataTypes.DOUBLE },
  machineName: { type: DataTypes.STRING },
});

export default WaveCrestCoefficient;
