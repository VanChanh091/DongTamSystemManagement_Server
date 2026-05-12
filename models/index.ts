import { sequelize } from "../assets/configs/connect/database.connect";
import { initFluteRatioCoefficientModel } from "./admin/fluteRatio";
import { initMachineBoxModel } from "./admin/machineBox";
import { initMachinePaperModel } from "./admin/machinePaper";
import { initVehicleModel } from "./admin/vehicle";
import { initWasteNormBoxModel } from "./admin/wasteNormBox";
import { initWasteNormPaperModel } from "./admin/wasteNormPaper";
import { initWaveCrestCoefficientModel } from "./admin/waveCrestCoefficient";
import { initCustomerModel } from "./customer/customer";
import { initCustomerPaymentModel } from "./customer/customerPayment";
import { initDeliveryItemModel } from "./delivery/deliveryItem";
import { initDeliveryPlanModel } from "./delivery/deliveryPlan";
import { initDeliveryRequestModel } from "./delivery/deliveryRequest";
import { initEmployeeBasicInfoModel } from "./employee/employeeBasicInfo";
import { initEmployeeCompanyInfoModel } from "./employee/employeeCompanyInfo";
import { initBoxModel } from "./order/box";
import { initOrderModel } from "./order/order";
import { initOrderImageModel } from "./order/orderImage";
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
import { initInventoryModel } from "./warehouse/inventory/inventory";
import { initLiquidationInventoryModel } from "./warehouse/inventory/liquidationInventory";
import { initOutboundDetailModel } from "./warehouse/outboundDetail";
import { initOutboundHistoryModel } from "./warehouse/outboundHistory";

//other
const User = initUserModel(sequelize);
const Product = initProductModel(sequelize);

//customer
const Customer = initCustomerModel(sequelize);
const CustomerPayment = initCustomerPaymentModel(sequelize);

//order
const Order = initOrderModel(sequelize);
const Box = initBoxModel(sequelize);
const OrderImage = initOrderImageModel(sequelize);

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
const LiquidationInv = initLiquidationInventoryModel(sequelize);

//delivery
const DeliveryRequest = initDeliveryRequestModel(sequelize);
const DeliveryPlan = initDeliveryPlanModel(sequelize);
const DeliveryItem = initDeliveryItemModel(sequelize);

const models = {
  User,
  Product,

  //Customer
  Customer,
  CustomerPayment,

  //order
  Order,
  Box,
  OrderImage,

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

  //inventory
  Inventory,
  LiquidationInv,

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

//===============================CUSTOMER=================================
Customer.hasOne(CustomerPayment, { foreignKey: "customerId", as: "payment", onDelete: "CASCADE" });
CustomerPayment.belongsTo(Customer, { foreignKey: "customerId" });

//1 customer have many orders and 1 order belongs to 1 customer
Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

//===============================PRODUCT=================================
Product.hasMany(Order, { foreignKey: "productId", onDelete: "CASCADE" });
Order.belongsTo(Product, { foreignKey: "productId" });

//===============================ORDER=================================
Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
Box.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(OrderImage, { foreignKey: "orderId", onDelete: "CASCADE" });
OrderImage.belongsTo(Order, { foreignKey: "orderId" });

//===============================USER=================================
User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

//===============================PLANNING PAPER=================================
Order.hasMany(PlanningPaper, { foreignKey: "orderId" }); //hasMany to create timeOverflow planning
PlanningPaper.belongsTo(Order, { foreignKey: "orderId" });

Order.hasMany(PlanningBox, { foreignKey: "orderId" });
PlanningBox.belongsTo(Order, { foreignKey: "orderId" });

//===============================PLANNING BOX=================================
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

//===============================TIME OVERFLOW=================================
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

//===============================REPORT=================================
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

//===============================EMPLOYEE=================================
EmployeeBasicInfo.hasOne(EmployeeCompanyInfo, {
  foreignKey: "employeeId",
  as: "companyInfo",
  onDelete: "CASCADE",
});
EmployeeCompanyInfo.belongsTo(EmployeeBasicInfo, { foreignKey: "employeeId", as: "basicInfo" });

//===============================QC SESSION=================================
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

//===============================INBOUND=================================
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

//===============================OUTBOUND=================================
OutboundHistory.hasMany(OutboundDetail, {
  foreignKey: "outboundId",
  as: "detail",
  onDelete: "CASCADE",
});
OutboundDetail.belongsTo(OutboundHistory, { foreignKey: "outboundId" });

Order.hasMany(OutboundDetail, { foreignKey: "orderId", onDelete: "CASCADE" });
OutboundDetail.belongsTo(Order, { foreignKey: "orderId" });

//===============================INVENTORY=================================
Order.hasOne(Inventory, { foreignKey: "orderId", onDelete: "CASCADE" });
Inventory.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(LiquidationInv, { foreignKey: "orderId", onDelete: "CASCADE" });
LiquidationInv.belongsTo(Order, { foreignKey: "orderId" });

Inventory.hasOne(LiquidationInv, { foreignKey: "inventoryId", onDelete: "CASCADE" });
LiquidationInv.belongsTo(Inventory, { foreignKey: "inventoryId" });

//===============================DELIVERY=================================
PlanningPaper.hasMany(DeliveryRequest, { foreignKey: "planningId", onDelete: "CASCADE" });
DeliveryRequest.belongsTo(PlanningPaper, { foreignKey: "planningId" });

User.hasOne(DeliveryRequest, { foreignKey: "userId" });
DeliveryRequest.belongsTo(User, { foreignKey: "userId" });

DeliveryPlan.hasMany(DeliveryItem, { foreignKey: "deliveryId", onDelete: "CASCADE" });
DeliveryItem.belongsTo(DeliveryPlan, { foreignKey: "deliveryId" });

DeliveryRequest.hasOne(DeliveryItem, { foreignKey: "requestId", onDelete: "CASCADE" });
DeliveryItem.belongsTo(DeliveryRequest, { foreignKey: "requestId" });

Vehicle.hasOne(DeliveryItem, { foreignKey: "vehicleId" });
DeliveryItem.belongsTo(Vehicle, { foreignKey: "vehicleId" });

export default models;
