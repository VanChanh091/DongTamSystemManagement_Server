import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Product = sequelize.define(
  "Product",
  {
    productId: {
      type: DataTypes.STRING(15),
      allowNull: false,
      primaryKey: true,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default Product;
