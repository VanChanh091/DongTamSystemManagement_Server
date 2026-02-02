"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connectDB_1 = require("../assest/configs/connectDB");
const fluteRatio_1 = require("./admin/fluteRatio");
const machineBox_1 = require("./admin/machineBox");
const machinePaper_1 = require("./admin/machinePaper");
const vehicle_1 = require("./admin/vehicle");
const wasteNormBox_1 = require("./admin/wasteNormBox");
const wasteNormPaper_1 = require("./admin/wasteNormPaper");
const waveCrestCoefficient_1 = require("./admin/waveCrestCoefficient");
const customer_1 = require("./customer/customer");
const deliveryItem_1 = require("./delivery/deliveryItem");
const deliveryPlan_1 = require("./delivery/deliveryPlan");
const deliveryRequest_1 = require("./delivery/deliveryRequest");
const employeeBasicInfo_1 = require("./employee/employeeBasicInfo");
const employeeCompanyInfo_1 = require("./employee/employeeCompanyInfo");
const box_1 = require("./order/box");
const order_1 = require("./order/order");
const planningBox_1 = require("./planning/planningBox");
const planningBoxMachineTime_1 = require("./planning/planningBoxMachineTime");
const planningPaper_1 = require("./planning/planningPaper");
const timeOverflowPlanning_1 = require("./planning/timeOverflowPlanning");
const product_1 = require("./product/product");
const qcCriteria_1 = require("./qualityControl/qcCriteria");
const qcSampleResult_1 = require("./qualityControl/qcSampleResult");
const qcSession_1 = require("./qualityControl/qcSession");
const reportPlanningBox_1 = require("./report/reportPlanningBox");
const reportPlanningPaper_1 = require("./report/reportPlanningPaper");
const user_1 = require("./user/user");
const inboundHistory_1 = require("./warehouse/inboundHistory");
const inventory_1 = require("./warehouse/inventory");
const outboundDetail_1 = require("./warehouse/outboundDetail");
const outboundHistory_1 = require("./warehouse/outboundHistory");
//other
const User = (0, user_1.initUserModel)(connectDB_1.sequelize);
const Customer = (0, customer_1.initCustomerModel)(connectDB_1.sequelize);
const Order = (0, order_1.initOrderModel)(connectDB_1.sequelize);
const Box = (0, box_1.initBoxModel)(connectDB_1.sequelize);
const Product = (0, product_1.initProductModel)(connectDB_1.sequelize);
//planning
const PlanningPaper = (0, planningPaper_1.initPlanningPaperModel)(connectDB_1.sequelize);
const PlanningBox = (0, planningBox_1.initPlanningBoxModel)(connectDB_1.sequelize);
const timeOverflowPlanning = (0, timeOverflowPlanning_1.initTimeOverflowPlanningModel)(connectDB_1.sequelize);
const PlanningBoxTime = (0, planningBoxMachineTime_1.initPlanningBoxTimeModel)(connectDB_1.sequelize);
//report
const ReportPlanningPaper = (0, reportPlanningPaper_1.initReportPlanningPaperModel)(connectDB_1.sequelize);
const ReportPlanningBox = (0, reportPlanningBox_1.initReportPlanningBoxModel)(connectDB_1.sequelize);
//employee
const EmployeeBasicInfo = (0, employeeBasicInfo_1.initEmployeeBasicInfoModel)(connectDB_1.sequelize);
const EmployeeCompanyInfo = (0, employeeCompanyInfo_1.initEmployeeCompanyInfoModel)(connectDB_1.sequelize);
//admin
const MachinePaper = (0, machinePaper_1.initMachinePaperModel)(connectDB_1.sequelize);
const MachineBox = (0, machineBox_1.initMachineBoxModel)(connectDB_1.sequelize);
const WasteNormPaper = (0, wasteNormPaper_1.initWasteNormPaperModel)(connectDB_1.sequelize);
const WasteNormBox = (0, wasteNormBox_1.initWasteNormBoxModel)(connectDB_1.sequelize);
const WaveCrestCoefficient = (0, waveCrestCoefficient_1.initWaveCrestCoefficientModel)(connectDB_1.sequelize);
const Vehicle = (0, vehicle_1.initVehicleModel)(connectDB_1.sequelize);
const FluteRatio = (0, fluteRatio_1.initFluteRatioCoefficientModel)(connectDB_1.sequelize);
//QC
const QcSession = (0, qcSession_1.initQcSessionModel)(connectDB_1.sequelize);
const QcCriteria = (0, qcCriteria_1.initQcCriteriaModel)(connectDB_1.sequelize);
const QcSampleResult = (0, qcSampleResult_1.initQcSamepleResultModel)(connectDB_1.sequelize);
//warehouse
const InboundHistory = (0, inboundHistory_1.initInboundHistoryModel)(connectDB_1.sequelize);
const OutboundHistory = (0, outboundHistory_1.initOutboundHistoryModel)(connectDB_1.sequelize);
const OutboundDetail = (0, outboundDetail_1.initOutboundDetailModel)(connectDB_1.sequelize);
//inventory
const Inventory = (0, inventory_1.initInventoryModel)(connectDB_1.sequelize);
//delivery
const DeliveryRequest = (0, deliveryRequest_1.initDeliveryRequestModel)(connectDB_1.sequelize);
const DeliveryPlan = (0, deliveryPlan_1.initDeliveryPlanModel)(connectDB_1.sequelize);
const DeliveryItem = (0, deliveryItem_1.initDeliveryItemModel)(connectDB_1.sequelize);
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
exports.default = models;
//# sourceMappingURL=index.js.map