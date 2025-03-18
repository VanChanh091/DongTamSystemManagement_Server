import Customer from "./customer/customer.js";
import Box from "./order/box.js";
import InfoProduction from "./order/infoProduction.js";
import Order from "./order/order.js";
import QuantitativePaper from "./order/quantitativePaper.js";
import User from "./user/user.js";

const models = {
  User,
  Customer,
  InfoProduction,
  QuantitativePaper,
  Order,
  Box,
};

Customer.hasMany(Order, { foreignKey: "customerId" });
InfoProduction.hasOne(Order, { foreignKey: "infoProductionId" });
QuantitativePaper.hasOne(Order, { foreignKey: "quantitativePaperId" });
Box.hasOne(Order, { foreignKey: "boxId" });

Order.belongsTo(Customer, { foreignKey: "customerId" });
Order.belongsTo(InfoProduction, { foreignKey: "infoProductionId" });
Order.belongsTo(QuantitativePaper, { foreignKey: "quantitativePaperId" });
Order.belongsTo(Box, { foreignKey: "boxId" });

export default models;
