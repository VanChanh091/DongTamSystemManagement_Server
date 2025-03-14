import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Customer = sequelize.define(
  "Customer",
  {
    customerId: {
      type: DataTypes.STRING(15),
      allowNull: false,
      primaryKey: true,
    },
    customerName: { type: DataTypes.STRING, allowNull: false },
    companyName: { type: DataTypes.STRING, allowNull: false },
    companyAddress: { type: DataTypes.STRING, allowNull: false },
    shippingAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mst: { type: DataTypes.STRING, allowNull: true, unique: true },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cskh: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: true }
);

Customer.associations = (model) => {
  Customer.hasMany(model.Order, { foreignKey: "customerId" });
};

export default Customer;
