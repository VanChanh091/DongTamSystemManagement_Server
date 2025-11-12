"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connectDB_1 = require("../configs/connectDB");
const machineBox_1 = require("./admin/machineBox");
const machinePaper_1 = require("./admin/machinePaper");
const wasteNormBox_1 = require("./admin/wasteNormBox");
const wasteNormPaper_1 = require("./admin/wasteNormPaper");
const waveCrestCoefficient_1 = require("./admin/waveCrestCoefficient");
const customer_1 = require("./customer/customer");
const employeeBasicInfo_1 = require("./employee/employeeBasicInfo");
const employeeCompanyInfo_1 = require("./employee/employeeCompanyInfo");
const box_1 = require("./order/box");
const order_1 = require("./order/order");
const planningBox_1 = require("./planning/planningBox");
const planningBoxMachineTime_1 = require("./planning/planningBoxMachineTime");
const planningPaper_1 = require("./planning/planningPaper");
const timeOverflowPlanning_1 = require("./planning/timeOverflowPlanning");
const product_1 = require("./product/product");
const reportPlanningBox_1 = require("./report/reportPlanningBox");
const reportPlanningPaper_1 = require("./report/reportPlanningPaper");
const user_1 = require("./user/user");
const User = (0, user_1.initUserModel)(connectDB_1.sequelize);
const Customer = (0, customer_1.initCustomerModel)(connectDB_1.sequelize);
const Order = (0, order_1.initOrderModel)(connectDB_1.sequelize);
const Box = (0, box_1.initBoxModel)(connectDB_1.sequelize);
const Product = (0, product_1.initProductModel)(connectDB_1.sequelize);
const PlanningPaper = (0, planningPaper_1.initPlanningPaperModel)(connectDB_1.sequelize);
const PlanningBox = (0, planningBox_1.initPlanningBoxModel)(connectDB_1.sequelize);
const timeOverflowPlanning = (0, timeOverflowPlanning_1.initTimeOverflowPlanningModel)(connectDB_1.sequelize);
const PlanningBoxTime = (0, planningBoxMachineTime_1.initPlanningBoxTimeModel)(connectDB_1.sequelize);
const ReportPlanningPaper = (0, reportPlanningPaper_1.initReportPlanningPaperModel)(connectDB_1.sequelize);
const ReportPlanningBox = (0, reportPlanningBox_1.initReportPlanningBoxModel)(connectDB_1.sequelize);
const EmployeeBasicInfo = (0, employeeBasicInfo_1.initEmployeeBasicInfoModel)(connectDB_1.sequelize);
const EmployeeCompanyInfo = (0, employeeCompanyInfo_1.initEmployeeCompanyInfoModel)(connectDB_1.sequelize);
const MachinePaper = (0, machinePaper_1.initMachinePaperModel)(connectDB_1.sequelize);
const MachineBox = (0, machineBox_1.initMachineBoxModel)(connectDB_1.sequelize);
const WasteNormPaper = (0, wasteNormPaper_1.initWasteNormPaperModel)(connectDB_1.sequelize);
const WasteNormBox = (0, wasteNormBox_1.initWasteNormBoxModel)(connectDB_1.sequelize);
const WaveCrestCoefficient = (0, waveCrestCoefficient_1.initWaveCrestCoefficientModel)(connectDB_1.sequelize);
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
exports.default = models;
//# sourceMappingURL=index.js.map