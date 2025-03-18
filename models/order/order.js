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
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    companyName: { type: DataTypes.STRING, allowNull: false },
    dayReceiveOrder: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.DATE,
    },
    song: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    QC_box: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    structure: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // lengthPaper: {
    //   type: DataTypes.DOUBLE,
    //   allowNull: false,
    // },
    // paperSize: {
    //   type: DataTypes.DOUBLE,
    //   allowNull: false,
    // },
    // quantity: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    // acreage: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    // price: {
    //   type: DataTypes.DOUBLE,
    //   allowNull: false,
    // },
    // pricePaper: {
    //   type: DataTypes.DOUBLE,
    //   allowNull: false,
    // },
    // dateRequestShipping: {
    //   type: DataTypes.DATE,
    //   allowNull: false,
    //   defaultValue: DataTypes.DATE,
    // },
    // quantitativePaperId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    // infoProductionId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    vat: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    // boxId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    totalPrice: {
      type: DataTypes.DOUBLE,
    },
  },
  { timestamps: true }
);

export default Order;
