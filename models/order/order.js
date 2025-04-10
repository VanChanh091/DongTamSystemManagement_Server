import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Order = sequelize.define(
  "Order",
  {
    orderId: { type: DataTypes.STRING(18), allowNull: false, primaryKey: true },
    dayReceiveOrder: { type: DataTypes.DATE, allowNull: false },
    typeProduct: { type: DataTypes.STRING },
    productName: { type: DataTypes.STRING },
    song: { type: DataTypes.STRING },
    QC_box: { type: DataTypes.STRING },
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
    vat: { type: DataTypes.INTEGER },
  },
  { timestamps: true }
);

export default Order;
