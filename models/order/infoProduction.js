import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const InfoProduction = sequelize.define(
  "InfoProduction",
  {
    infoProductionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    structureReplace: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sizePaper: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    instructSpecial: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numberChild: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teBien: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nextStep: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default InfoProduction;
