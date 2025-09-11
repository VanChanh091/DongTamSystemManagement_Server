import { DataTypes, NOW } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Customer = sequelize.define(
  "Customer",
  {
    customerId: {
      type: DataTypes.STRING(14),
      allowNull: false,
      primaryKey: true,
    },
    customerName: { type: DataTypes.STRING, allowNull: false },
    companyName: { type: DataTypes.STRING, allowNull: false },
    companyAddress: { type: DataTypes.STRING, allowNull: false },
    shippingAddress: { type: DataTypes.STRING, allowNull: false },
    mst: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    contactPerson: { type: DataTypes.STRING },
    dayCreated: { type: DataTypes.DATE },
    cskh: { type: DataTypes.STRING, allowNull: false },
  },
  { timestamps: true }
);

export default Customer;
