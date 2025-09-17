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
import ReportPlanningBox from "./report/reportPlanningBox.js";
import ReportPlanningPaper from "./report/reportPlanningPaper.js";
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

  //report
  ReportPlanningPaper,
  ReportPlanningBox,

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

//order
Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

//user
User.hasMany(Order, { foreignKey: "userId", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: "userId" });

//planning paper
Order.hasMany(PlanningPaper, { foreignKey: "orderId" }); //hasMany to create timeOverflow planning
PlanningPaper.belongsTo(Order, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

Order.hasMany(PlanningBox, { foreignKey: "orderId" });
PlanningBox.belongsTo(Order, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

//planning box
PlanningPaper.hasOne(PlanningBox, { foreignKey: "planningId" });
PlanningBox.belongsTo(PlanningPaper, { foreignKey: "planningId" });

PlanningBox.hasMany(PlanningBoxTime, {
  foreignKey: "planningBoxId",
  as: "boxTimes",
});
PlanningBoxTime.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

//created to get all box times
PlanningBox.hasMany(PlanningBoxTime, {
  foreignKey: "planningBoxId",
  as: "allBoxTimes",
});
PlanningBoxTime.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

//report
PlanningPaper.hasMany(ReportPlanningPaper, {
  foreignKey: "planningId",
  as: "reportPaper",
  onDelete: "CASCADE",
});
ReportPlanningPaper.belongsTo(PlanningPaper, { foreignKey: "planningId" });

PlanningBox.hasMany(ReportPlanningBox, {
  foreignKey: "planningBoxId",
  as: "reportBox",
  onDelete: "CASCADE",
});
ReportPlanningBox.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

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
