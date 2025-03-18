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
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    songE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    matE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    songB: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    matB: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    songC: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    matC: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { timestamps: true }
);

QuantitativePaper.associations = (model) => {
  QuantitativePaper.hasOne(model.Order, { foreignKey: "quantitativePaperId" });
};

export default QuantitativePaper;
