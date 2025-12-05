import { sequelize } from "../configs/connectDB";
import { initMachineBoxModel } from "./admin/machineBox";
import { initMachinePaperModel } from "./admin/machinePaper";
import { initWasteNormBoxModel } from "./admin/wasteNormBox";
import { initWasteNormPaperModel } from "./admin/wasteNormPaper";
import { initWaveCrestCoefficientModel } from "./admin/waveCrestCoefficient";
import { initCustomerModel } from "./customer/customer";
import { initEmployeeBasicInfoModel } from "./employee/employeeBasicInfo";
import { initEmployeeCompanyInfoModel } from "./employee/employeeCompanyInfo";
import { initBoxModel } from "./order/box";
import { initOrderModel } from "./order/order";
import { initPlanningBoxModel } from "./planning/planningBox";
import { initPlanningBoxTimeModel } from "./planning/planningBoxMachineTime";
import { initPlanningPaperModel } from "./planning/planningPaper";
import { initTimeOverflowPlanningModel } from "./planning/timeOverflowPlanning";
import { initProductModel } from "./product/product";
import { initReportPlanningBoxModel } from "./report/reportPlanningBox";
import { initReportPlanningPaperModel } from "./report/reportPlanningPaper";
import { initUserModel } from "./user/user";
import { initInboundHistoryModel } from "./warehouse/inboundHistory";
import { initOutboundHistoryModel } from "./warehouse/outboundHistory";

const User = initUserModel(sequelize);
const Customer = initCustomerModel(sequelize);
const Order = initOrderModel(sequelize);
const Box = initBoxModel(sequelize);
const Product = initProductModel(sequelize);
const PlanningPaper = initPlanningPaperModel(sequelize);
const PlanningBox = initPlanningBoxModel(sequelize);
const timeOverflowPlanning = initTimeOverflowPlanningModel(sequelize);
const PlanningBoxTime = initPlanningBoxTimeModel(sequelize);
const ReportPlanningPaper = initReportPlanningPaperModel(sequelize);
const ReportPlanningBox = initReportPlanningBoxModel(sequelize);
const EmployeeBasicInfo = initEmployeeBasicInfoModel(sequelize);
const EmployeeCompanyInfo = initEmployeeCompanyInfoModel(sequelize);
const MachinePaper = initMachinePaperModel(sequelize);
const MachineBox = initMachineBoxModel(sequelize);
const WasteNormPaper = initWasteNormPaperModel(sequelize);
const WasteNormBox = initWasteNormBoxModel(sequelize);
const WaveCrestCoefficient = initWaveCrestCoefficientModel(sequelize);
const InboundHistory = initInboundHistoryModel(sequelize);
const OutboundHistory = initOutboundHistoryModel(sequelize);

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

  //employee
  EmployeeBasicInfo,
  EmployeeCompanyInfo,

  //warehouse
  InboundHistory,
  OutboundHistory,

  //admin
  MachinePaper,
  MachineBox,
  WasteNormPaper,
  WasteNormBox,
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
User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

//planning paper
Order.hasMany(PlanningPaper, { foreignKey: "orderId" }); //hasMany to create timeOverflow planning
PlanningPaper.belongsTo(Order, { foreignKey: "orderId" });

Order.hasMany(PlanningBox, { foreignKey: "orderId" });
PlanningBox.belongsTo(Order, { foreignKey: "orderId" });

//planning box
PlanningPaper.hasOne(PlanningBox, { foreignKey: "planningId", onDelete: "CASCADE" });
PlanningBox.belongsTo(PlanningPaper, { foreignKey: "planningId" });

PlanningBox.hasMany(PlanningBoxTime, {
  foreignKey: "planningBoxId",
  as: "boxTimes",
  onDelete: "CASCADE",
});
PlanningBoxTime.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

//created to get all box times
PlanningBox.hasMany(PlanningBoxTime, {
  foreignKey: "planningBoxId",
  as: "allBoxTimes",
  onDelete: "CASCADE",
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

//inbound and outbound history
PlanningPaper.hasMany(InboundHistory, {
  foreignKey: "planningId",
  onDelete: "CASCADE",
});
InboundHistory.belongsTo(PlanningPaper, { foreignKey: "planningId" });

PlanningBox.hasMany(InboundHistory, {
  foreignKey: "planningBoxId",
  onDelete: "CASCADE",
});
InboundHistory.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

Order.hasMany(OutboundHistory, { foreignKey: "orderId", onDelete: "CASCADE" });
OutboundHistory.belongsTo(Order, { foreignKey: "orderId" });

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

//employee
EmployeeBasicInfo.hasOne(EmployeeCompanyInfo, {
  foreignKey: "employeeId",
  as: "companyInfo",
  onDelete: "CASCADE",
});
EmployeeCompanyInfo.belongsTo(EmployeeBasicInfo, {
  foreignKey: "employeeId",
  as: "basicInfo",
});

export default models;
