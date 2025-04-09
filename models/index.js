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
  Order,
  Box,
};

Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

Order.hasOne(InfoProduction, {
  foreignKey: "orderId",
  as: "infoProduction",
  onDelete: "CASCADE",
});
InfoProduction.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

export default models;
