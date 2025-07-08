import PaperFactor from "./admin/paperFactor.js";
import Customer from "./customer/customer.js";
import Box from "./order/box.js";
import Order from "./order/order.js";
import PaperConsumptionNorm from "./planning/paperConsumptionNorm.js";
import Planning from "./planning/planning.js";
import timeOverflowPlanning from "./planning/timeOverFlowPlanning.js";
import Product from "./product/product.js";
import User from "./user/user.js";

const models = {
  User,
  Customer,
  Order,
  Box,
  Product,
  Planning,
  PaperConsumptionNorm,
  PaperFactor,
};

//customer
//1 customer have many orders and 1 order belongs to 1 customer
Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

//product
Product.hasMany(Order, { foreignKey: "productId", onDelete: "CASCADE" });
Order.belongsTo(Product, { foreignKey: "productId" });

//order
Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

//planning
Planning.hasOne(PaperConsumptionNorm, {
  foreignKey: "planningId",
  as: "norm",
  onDelete: "CASCADE",
});
PaperConsumptionNorm.belongsTo(Planning, { foreignKey: "planningId" });

Order.hasOne(Planning, { foreignKey: "orderId" });
Planning.belongsTo(Order, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

Planning.hasOne(timeOverflowPlanning, {
  foreignKey: "planningId",
  as: "timeOverFlow",
  onDelete: "CASCADE",
});
timeOverflowPlanning.belongsTo(Planning, { foreignKey: "planningId" });

export default models;
