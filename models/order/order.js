import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Order = sequelize.define(
  "Order",
  {
    orderId: { type: DataTypes.STRING(14), allowNull: false, primaryKey: true },
    dayReceiveOrder: { type: DataTypes.DATE, allowNull: false },
    flute: { type: DataTypes.STRING },
    QC_box: { type: DataTypes.STRING },
    canLan: { type: DataTypes.STRING },
    daoXa: { type: DataTypes.STRING },
    day: { type: DataTypes.STRING },
    matE: { type: DataTypes.STRING },
    matB: { type: DataTypes.STRING },
    matC: { type: DataTypes.STRING },
    songE: { type: DataTypes.STRING },
    songB: { type: DataTypes.STRING },
    songC: { type: DataTypes.STRING },
    songE2: { type: DataTypes.STRING },
    lengthPaperCustomer: { type: DataTypes.DOUBLE, allowNull: false },
    lengthPaperManufacture: { type: DataTypes.DOUBLE, allowNull: false },
    paperSizeCustomer: { type: DataTypes.DOUBLE, allowNull: false },
    paperSizeManufacture: { type: DataTypes.DOUBLE, allowNull: false },
    quantityCustomer: { type: DataTypes.INTEGER, allowNull: false },
    quantityManufacture: { type: DataTypes.INTEGER, allowNull: false },
    numberChild: { type: DataTypes.INTEGER, allowNull: false },
    acreage: { type: DataTypes.DOUBLE, allowNull: false },
    dvt: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false },
    pricePaper: { type: DataTypes.DOUBLE, allowNull: false },
    discount: { type: DataTypes.DOUBLE },
    profit: { type: DataTypes.DOUBLE, allowNull: false },
    dateRequestShipping: { type: DataTypes.DATE, allowNull: false },
    totalPrice: { type: DataTypes.DOUBLE },
    vat: { type: DataTypes.INTEGER },
    instructSpecial: { type: DataTypes.STRING },
    status: {
      type: DataTypes.ENUM("pending", "accept", "reject", "planning"),
      allowNull: false,
      defaultValue: "pending",
    },
    rejectReason: { type: DataTypes.STRING },
  },
  { timestamps: true }
);

export default Order;
