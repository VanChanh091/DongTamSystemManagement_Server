import Customer from "./customer/customer.js";
import Box from "./order/box.js";
import InfoProduction from "./order/infoProduction.js";
import Order from "./order/order.js";
import Product from "./product/product.js";
import User from "./user/user.js";

const models = {
  User,
  Customer,
  InfoProduction,
  Order,
  Box,
  Product,
};

//1 customer have many orders and 1 order belongs to 1 customer
Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

Product.hasMany(Order, { foreignKey: "productId", onDelete: "CASCADE" });
Order.belongsTo(Product, { foreignKey: "productId" });

Order.hasOne(InfoProduction, {
  foreignKey: "orderId",
  as: "infoProduction",
  onDelete: "CASCADE",
});
InfoProduction.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

export default models;
