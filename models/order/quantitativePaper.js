import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const QuantitativePaper = sequelize.define(
  "QuantitativePaper",
  {
    quantitativePaperId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    day: {
      type: DataTypes.ENUM(90, 95, 100, 110, 115, 120, 125, 140, 150, 160, 170),
      allowNull: false,
    },
    songE: {
      type: DataTypes.ENUM(90, 95, 100, 110, 115, 120, 125, 140, 150, 185),
      allowNull: false,
    },
    matE: {
      type: DataTypes.ENUM(90, 95, 100, 110, 115, 120, 125, 140, 150, 170, 230),
      allowNull: false,
    },
    songB: {
      type: DataTypes.ENUM(
        90,
        95,
        100,
        110,
        115,
        120,
        125,
        140,
        150,
        160,
        170,
        170,
        220
      ),
      allowNull: false,
    },
    matB: {
      type: DataTypes.ENUM(
        14,
        90,
        95,
        100,
        105,
        110,
        115,
        120,
        125,
        140,
        150,
        170,
        200,
        220
      ),
      allowNull: false,
    },
    songC: {
      type: DataTypes.ENUM(
        90,
        95,
        100,
        105,
        110,
        115,
        120,
        125,
        140,
        150,
        160,
        170,
        180,
        185,
        220
      ),
      allowNull: false,
    },
    matC: {
      type: DataTypes.ENUM(
        90,
        95,
        100,
        105,
        110,
        115,
        120,
        125,
        140,
        150,
        170,
        180
      ),
      allowNull: false,
    },
  },
  { timestamps: true }
);

QuantitativePaper.associations = (model) => {
  QuantitativePaper.hasOne(model.Order, { foreignKey: "quantitativePaperId" });
};

export default QuantitativePaper;
