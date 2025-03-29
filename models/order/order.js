import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Order = sequelize.define(
  "Order",
  {
    orderId: {
      type: DataTypes.STRING(18),
      primaryKey: true,
      allowNull: false,
    },
    dayReceiveOrder: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    song: { type: DataTypes.STRING, allowNull: false },
    typeProduct: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productName: { type: DataTypes.STRING, allowNull: false },
    QC_box: { type: DataTypes.STRING, allowNull: false },
    day: { type: DataTypes.STRING },
    middle_1: { type: DataTypes.STRING },
    middle_2: { type: DataTypes.STRING },
    mat: { type: DataTypes.STRING },
    songE: { type: DataTypes.STRING },
    songB: { type: DataTypes.STRING },
    songC: { type: DataTypes.STRING },
    songE2: { type: DataTypes.STRING },
    lengthPaper: { type: DataTypes.DOUBLE, allowNull: false },
    paperSize: { type: DataTypes.DOUBLE, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    acreage: { type: DataTypes.DOUBLE, allowNull: false },
    dvt: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false },
    pricePaper: { type: DataTypes.DOUBLE, allowNull: false },
    dateRequestShipping: { type: DataTypes.DATE, allowNull: false },
    totalPrice: { type: DataTypes.DOUBLE },
    vat: { type: DataTypes.DOUBLE },
  },
  { timestamps: true }
);

export default Order;
