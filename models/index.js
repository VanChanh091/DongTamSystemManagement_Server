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

Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

Order.hasOne(InfoProduction, {
  foreignKey: "orderId",
  as: "infoProduction",
  onDelete: "CASCADE",
});
InfoProduction.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(QuantitativePaper, {
  foreignKey: "orderId",
  as: "quantitativePaper",
  onDelete: "CASCADE",
});
QuantitativePaper.belongsTo(Order, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

// InfoProduction.hasOne(Order, { foreignKey: "infoProductionId" });
// QuantitativePaper.hasOne(Order, { foreignKey: "quantitativePaperId" });
// Box.hasOne(Order, { foreignKey: "boxId" });

// Order.belongsTo(InfoProduction, { foreignKey: "infoProductionId" });
// Order.belongsTo(QuantitativePaper, { foreignKey: "quantitativePaperId" });
// Order.belongsTo(Box, { foreignKey: "boxId" });

export default models;
