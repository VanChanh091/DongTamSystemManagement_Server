import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Order = sequelize.define(
  "Order",
  {
    orderId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    customerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dayReceiveOrder: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.DATE,
    },
    song: {
      type: DataTypes.ENUM(
        "1N",
        "2B",
        "2C",
        "2E",
        "3B",
        "3C",
        "3E",
        "4BC",
        "4BE",
        "4CE",
        "4EE",
        "5BC",
        "5BE",
        "5CE",
        "5EE",
        "6BCE",
        "7BCE",
        "7CBC",
        "A",
        "CBC",
        "Giấy cuộn"
      ),
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
    lengthPaper: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    paperSize: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    acreage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    pricePaper: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    dateRequestShipping: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.DATE,
    },

    quantitativePaperId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    infoProductionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    vat: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    boxId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    totalPrice: {
      type: DataTypes.DOUBLE,
    },
  },
  { timestamps: true }
);

Order.associations = (model) => {
  Order.belongsTo(model.Customer, { foreignKey: "customerId" });
  Order.belongsTo(model.InfoProduction, { foreignKey: "infoProductionId" });
  Order.belongsTo(model.QuantitativePaper, {
    foreignKey: "quantitativePaperId",
  });
  Order.belongsTo(model.Box, { foreignKey: "boxId" });
};

export default Order;
