import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Product = sequelize.define(
  "Product",
  {
    productId: {
      type: DataTypes.STRING(14),
      allowNull: false,
      primaryKey: true,
    },
    typeProduct: { type: DataTypes.STRING, allowNull: false },
    productName: { type: DataTypes.STRING, allowNull: false },
    maKhuon: { type: DataTypes.STRING, allowNull: false },
    productImage: { type: DataTypes.STRING },
  },
  { timestamps: true }
);

export default Product;
