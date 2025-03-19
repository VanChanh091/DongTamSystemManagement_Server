import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Box = sequelize.define(
  "Box",
  {
    boxId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inMatTruoc: {
      type: DataTypes.STRING,
    },
    inMatSau: {
      type: DataTypes.STRING,
    },
    canMang: {
      type: DataTypes.STRING,
    },
    Xa: {
      type: DataTypes.STRING,
    },
    catKhe: {
      type: DataTypes.STRING,
    },
    be: {
      type: DataTypes.STRING,
    },
    // inMatTruoc: {
    //   type: DataTypes.STRING,
    // },
    // inMatTruoc: {
    //   type: DataTypes.STRING,
    // },
    // inMatTruoc: {
    //   type: DataTypes.STRING,
    // },
    khac_1: {
      type: DataTypes.STRING,
    },
    khac_2: {
      type: DataTypes.STRING,
    },
  },
  { timestamps: true }
);

export default Box;
