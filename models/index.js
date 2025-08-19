import MachineBox from "./admin/machineBox.js";
import MachinePaper from "./admin/machinePaper.js";
import WasteNormPaper from "./admin/wasteNormPaper.js";
import WaveCrestCoefficient from "./admin/waveCrestCoefficient.js";
import Customer from "./customer/customer.js";
import Box from "./order/box.js";
import Order from "./order/order.js";
import PlanningBox from "./planning/planningBox.js";
import PlanningBoxTime from "./planning/planningBoxMachineTime.js";
import PlanningPaper from "./planning/planningPaper.js";
import timeOverflowPlanning from "./planning/timeOverFlowPlanning.js";
import Product from "./product/product.js";
import User from "./user/user.js";

const models = {
  User,
  Customer,
  Order,
  Box,
  Product,

  //planning
  PlanningPaper,
  PlanningBox,
  timeOverflowPlanning,
  PlanningBoxTime,

  //admin
  MachinePaper,
  MachineBox,
  WasteNormPaper,
  WaveCrestCoefficient,
};

//customer
//1 customer have many orders and 1 order belongs to 1 customer
Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

//product
Product.hasMany(Order, { foreignKey: "productId", onDelete: "CASCADE" });
Order.belongsTo(Product, { foreignKey: "productId" });

//Order
Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

//planning
Order.hasMany(PlanningPaper, { foreignKey: "orderId" }); //hasMany to create timeOverflow planning
PlanningPaper.belongsTo(Order, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

//planning box
PlanningPaper.hasOne(PlanningBox, { foreignKey: "planningId" });
PlanningBox.belongsTo(PlanningPaper, { foreignKey: "planningId" });

Order.hasMany(PlanningBox, { foreignKey: "orderId" });
PlanningBox.belongsTo(Order, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

PlanningBox.hasMany(PlanningBoxTime, {
  foreignKey: "planningBoxId",
  as: "boxTimes",
});
//created to get all box times
PlanningBox.hasMany(PlanningBoxTime, {
  foreignKey: "planningBoxId",
  as: "allBoxTimes",
});
PlanningBoxTime.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

//timeOverflowPlanning
PlanningPaper.hasOne(timeOverflowPlanning, {
  foreignKey: "planningId",
  as: "timeOverFlow",
  onDelete: "CASCADE",
  constraints: false,
});
timeOverflowPlanning.belongsTo(PlanningPaper, {
  foreignKey: "planningId",
  constraints: false,
});

PlanningBox.hasMany(timeOverflowPlanning, {
  foreignKey: "planningBoxId",
  as: "timeOverFlow",
  onDelete: "CASCADE",
  constraints: false,
});
timeOverflowPlanning.belongsTo(PlanningBox, {
  foreignKey: "planningBoxId",
  constraints: false,
});

export default models;
