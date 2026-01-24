import { sequelize } from "../assest/configs/connectDB";
import { initFluteRatioCoefficientModel } from "./admin/fluteRatio";
import { initMachineBoxModel } from "./admin/machineBox";
import { initMachinePaperModel } from "./admin/machinePaper";
import { initVehicleModel } from "./admin/vehicle";
import { initWasteNormBoxModel } from "./admin/wasteNormBox";
import { initWasteNormPaperModel } from "./admin/wasteNormPaper";
import { initWaveCrestCoefficientModel } from "./admin/waveCrestCoefficient";
import { initCustomerModel } from "./customer/customer";
import { initDeliveryItemModel } from "./delivery/deliveryItem";
import { initDeliveryPlanModel } from "./delivery/deliveryPlan";
import { initDeliveryRequestModel } from "./delivery/deliveryRequest";
import { initEmployeeBasicInfoModel } from "./employee/employeeBasicInfo";
import { initEmployeeCompanyInfoModel } from "./employee/employeeCompanyInfo";
import { initBoxModel } from "./order/box";
import { initOrderModel } from "./order/order";
import { initPlanningBoxModel } from "./planning/planningBox";
import { initPlanningBoxTimeModel } from "./planning/planningBoxMachineTime";
import { initPlanningPaperModel } from "./planning/planningPaper";
import { initTimeOverflowPlanningModel } from "./planning/timeOverflowPlanning";
import { initProductModel } from "./product/product";
import { initQcCriteriaModel } from "./qualityControl/qcCriteria";
import { initQcSamepleResultModel } from "./qualityControl/qcSampleResult";
import { initQcSessionModel } from "./qualityControl/qcSession";
import { initReportPlanningBoxModel } from "./report/reportPlanningBox";
import { initReportPlanningPaperModel } from "./report/reportPlanningPaper";
import { initUserModel } from "./user/user";
import { initInboundHistoryModel } from "./warehouse/inboundHistory";
import { initInventoryModel } from "./warehouse/inventory";
import { initOutboundDetailModel } from "./warehouse/outboundDetail";
import { initOutboundHistoryModel } from "./warehouse/outboundHistory";

//other
const User = initUserModel(sequelize);
const Customer = initCustomerModel(sequelize);
const Order = initOrderModel(sequelize);
const Box = initBoxModel(sequelize);
const Product = initProductModel(sequelize);

//planning
const PlanningPaper = initPlanningPaperModel(sequelize);
const PlanningBox = initPlanningBoxModel(sequelize);
const timeOverflowPlanning = initTimeOverflowPlanningModel(sequelize);
const PlanningBoxTime = initPlanningBoxTimeModel(sequelize);

//report
const ReportPlanningPaper = initReportPlanningPaperModel(sequelize);
const ReportPlanningBox = initReportPlanningBoxModel(sequelize);

//employee
const EmployeeBasicInfo = initEmployeeBasicInfoModel(sequelize);
const EmployeeCompanyInfo = initEmployeeCompanyInfoModel(sequelize);

//admin
const MachinePaper = initMachinePaperModel(sequelize);
const MachineBox = initMachineBoxModel(sequelize);
const WasteNormPaper = initWasteNormPaperModel(sequelize);
const WasteNormBox = initWasteNormBoxModel(sequelize);
const WaveCrestCoefficient = initWaveCrestCoefficientModel(sequelize);
const Vehicle = initVehicleModel(sequelize);
const FluteRatio = initFluteRatioCoefficientModel(sequelize);

//QC
const QcSession = initQcSessionModel(sequelize);
const QcCriteria = initQcCriteriaModel(sequelize);
const QcSampleResult = initQcSamepleResultModel(sequelize);

//warehouse
const InboundHistory = initInboundHistoryModel(sequelize);
const OutboundHistory = initOutboundHistoryModel(sequelize);
const OutboundDetail = initOutboundDetailModel(sequelize);

//inventory
const Inventory = initInventoryModel(sequelize);

//delivery
const DeliveryRequest = initDeliveryRequestModel(sequelize);
const DeliveryPlan = initDeliveryPlanModel(sequelize);
const DeliveryItem = initDeliveryItemModel(sequelize);

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

  //QC
  QcCriteria,
  QcSession,
  QcSampleResult,

  //warehouse
  InboundHistory,
  OutboundHistory,
  OutboundDetail,
  Inventory,

  //Delivery
  DeliveryRequest,
  DeliveryPlan,
  DeliveryItem,

  //admin
  MachinePaper,
  MachineBox,
  WasteNormPaper,
  WasteNormBox,
  WaveCrestCoefficient,
  Vehicle,
  FluteRatio,
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

//timeOverflowPlanning
PlanningPaper.hasOne(timeOverflowPlanning, {
  foreignKey: "planningId",
  as: "timeOverFlow",
  onDelete: "CASCADE",
  constraints: false,
});
timeOverflowPlanning.belongsTo(PlanningPaper, { foreignKey: "planningId", constraints: false });

PlanningBox.hasMany(timeOverflowPlanning, {
  foreignKey: "planningBoxId",
  as: "timeOverFlow",
  onDelete: "CASCADE",
  constraints: false,
});
timeOverflowPlanning.belongsTo(PlanningBox, { foreignKey: "planningBoxId", constraints: false });

//employee
EmployeeBasicInfo.hasOne(EmployeeCompanyInfo, {
  foreignKey: "employeeId",
  as: "companyInfo",
  onDelete: "CASCADE",
});
EmployeeCompanyInfo.belongsTo(EmployeeBasicInfo, { foreignKey: "employeeId", as: "basicInfo" });

//QC session
PlanningPaper.hasMany(QcSession, { foreignKey: "planningId", onDelete: "CASCADE" });
QcSession.belongsTo(PlanningPaper, { foreignKey: "planningId" });

PlanningBox.hasOne(QcSession, { foreignKey: "planningBoxId", onDelete: "CASCADE" });
QcSession.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

QcSession.hasMany(QcSampleResult, {
  foreignKey: "qcSessionId",
  as: "samples",
  onDelete: "CASCADE",
});
QcSampleResult.belongsTo(QcSession, { foreignKey: "qcSessionId" });

QcSession.hasMany(InboundHistory, {
  foreignKey: "qcSessionId",
  as: "inbound",
  onDelete: "CASCADE",
});
InboundHistory.belongsTo(QcSession, { foreignKey: "qcSessionId" });

//inbound history
Order.hasMany(InboundHistory, { foreignKey: "orderId", onDelete: "CASCADE" });
InboundHistory.belongsTo(Order, { foreignKey: "orderId" });

PlanningPaper.hasMany(InboundHistory, {
  foreignKey: "planningId",
  as: "inbound",
  onDelete: "CASCADE",
});
InboundHistory.belongsTo(PlanningPaper, { foreignKey: "planningId" });

PlanningBox.hasMany(InboundHistory, {
  foreignKey: "planningBoxId",
  as: "inbound",
  onDelete: "CASCADE",
});
InboundHistory.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

//outbound
OutboundHistory.hasMany(OutboundDetail, {
  foreignKey: "outboundId",
  as: "detail",
  onDelete: "CASCADE",
});
OutboundDetail.belongsTo(OutboundHistory, { foreignKey: "outboundId" });

Order.hasMany(OutboundDetail, { foreignKey: "orderId", onDelete: "CASCADE" });
OutboundDetail.belongsTo(Order, { foreignKey: "orderId" });

//inventory
Order.hasOne(Inventory, { foreignKey: "orderId", onDelete: "CASCADE" });
Inventory.belongsTo(Order, { foreignKey: "orderId" });

//delivery
PlanningPaper.hasOne(DeliveryRequest, { foreignKey: "planningId", onDelete: "CASCADE" });
DeliveryRequest.belongsTo(PlanningPaper, { foreignKey: "planningId" });

User.hasOne(DeliveryRequest, { foreignKey: "userId" });
DeliveryRequest.belongsTo(User, { foreignKey: "userId" });

DeliveryPlan.hasMany(DeliveryItem, { foreignKey: "deliveryId", onDelete: "CASCADE" });
DeliveryItem.belongsTo(DeliveryPlan, { foreignKey: "deliveryId" });

Vehicle.hasOne(DeliveryItem, { foreignKey: "vehicleId" });
DeliveryItem.belongsTo(Vehicle, { foreignKey: "vehicleId" });

export default models;
