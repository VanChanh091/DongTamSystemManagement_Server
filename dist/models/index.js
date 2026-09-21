"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_connect_1 = require("../assets/configs/connect/database.connect");
const criteriaBoxCheck_1 = require("./admin/criteriaCheck/criteriaBoxCheck");
const criteriaPaperCheck_1 = require("./admin/criteriaCheck/criteriaPaperCheck");
const fluteRatio_1 = require("./admin/fluteRatio");
const machineBox_1 = require("./admin/machineBox");
const machinePaper_1 = require("./admin/machinePaper");
const paperBasisWeights_1 = require("./admin/paperClassifications/paperBasisWeights");
const paperClassifications_1 = require("./admin/paperClassifications/paperClassifications");
const paperTypes_1 = require("./admin/paperClassifications/paperTypes");
const supplierPaperCodes_1 = require("./admin/paperClassifications/supplierPaperCodes");
const suppliers_1 = require("./admin/paperClassifications/suppliers");
const vehicle_1 = require("./admin/vehicle");
const wasteNormBox_1 = require("./admin/wasteNormBox");
const wasteNormPaper_1 = require("./admin/wasteNormPaper");
const waveCrestCoefficient_1 = require("./admin/waveCrestCoefficient");
const associations_1 = require("./associations");
const customer_1 = require("./customer/customer");
const customerPayment_1 = require("./customer/customerPayment");
const deliveryItem_1 = require("./delivery/deliveryItem");
const deliveryPlan_1 = require("./delivery/deliveryPlan");
const deliveryRequest_1 = require("./delivery/deliveryRequest");
const employeeBasicInfo_1 = require("./employee/employeeBasicInfo");
const employeeCompanyInfo_1 = require("./employee/employeeCompanyInfo");
const notification_1 = require("./notification/notification");
const userNotifications_1 = require("./notification/userNotifications");
const box_1 = require("./order/box");
const order_1 = require("./order/order");
const orderApproved_1 = require("./order/orderApproved");
const orderImage_1 = require("./order/orderImage");
const planningBox_1 = require("./planning/planningBox");
const planningBoxMachineTime_1 = require("./planning/planningBoxMachineTime");
const planningPaper_1 = require("./planning/planningPaper");
const paper_requirement_layers_1 = require("./planning/requirement/paper_requirement_layers");
const paperRequirements_1 = require("./planning/requirement/paperRequirements");
const timeOverflowPlanning_1 = require("./planning/timeOverflowPlanning");
const product_1 = require("./product/product");
const qcCriteria_1 = require("./qualityControl/qcCriteria");
const qcInspectionBox_1 = require("./qualityControl/qcInspection/qcInspectionBox");
const qcInspectionPaper_1 = require("./qualityControl/qcInspection/qcInspectionPaper");
const qcSampleResult_1 = require("./qualityControl/qcSampleResult");
const qcSession_1 = require("./qualityControl/qcSession");
const dailyReportPerformance_1 = require("./report/dailyReportPerformance");
const reportPlanningBox_1 = require("./report/reportPlanningBox");
const reportPlanningPaper_1 = require("./report/reportPlanningPaper");
const scrapReport_1 = require("./scrap/scrapReport");
const user_1 = require("./user/user");
const inboundHistory_1 = require("./warehouse/inboundHistory");
const inventory_1 = require("./warehouse/inventory/inventory");
const inventoryLog_1 = require("./warehouse/inventory/inventoryLog");
const inventoryTransfers_1 = require("./warehouse/inventory/inventoryTransfers");
const liquidationInventory_1 = require("./warehouse/inventory/liquidationInventory");
const outboundDetail_1 = require("./warehouse/outbound/outboundDetail");
const outboundHistory_1 = require("./warehouse/outbound/outboundHistory");
const paymentAllocation_1 = require("./warehouse/payment/paymentAllocation");
//admin
const MachinePaper = (0, machinePaper_1.initMachinePaperModel)(database_connect_1.sequelize);
const MachineBox = (0, machineBox_1.initMachineBoxModel)(database_connect_1.sequelize);
const WasteNormPaper = (0, wasteNormPaper_1.initWasteNormPaperModel)(database_connect_1.sequelize);
const WasteNormBox = (0, wasteNormBox_1.initWasteNormBoxModel)(database_connect_1.sequelize);
const WaveCrestCoefficient = (0, waveCrestCoefficient_1.initWaveCrestCoefficientModel)(database_connect_1.sequelize);
const Vehicle = (0, vehicle_1.initVehicleModel)(database_connect_1.sequelize);
const FluteRatio = (0, fluteRatio_1.initFluteRatioCoefficientModel)(database_connect_1.sequelize);
//admin criteria check
const CriteriaPaperCheck = (0, criteriaPaperCheck_1.initCriteriaPaperCheckModel)(database_connect_1.sequelize);
const CriteriaBoxCheck = (0, criteriaBoxCheck_1.initCriteriaBoxCheckModel)(database_connect_1.sequelize);
//admin paper classifications
const Suppliers = (0, suppliers_1.initSuppliersModel)(database_connect_1.sequelize);
const PaperTypes = (0, paperTypes_1.initPaperTypesModel)(database_connect_1.sequelize);
const PaperBasisWeights = (0, paperBasisWeights_1.initPaperBasisWeightsModel)(database_connect_1.sequelize);
const SupplierPaperCodes = (0, supplierPaperCodes_1.initSupplierPaperCodesModel)(database_connect_1.sequelize);
const PaperClassifications = (0, paperClassifications_1.initPaperClassificationsModel)(database_connect_1.sequelize);
//other
const User = (0, user_1.initUserModel)(database_connect_1.sequelize);
const Product = (0, product_1.initProductModel)(database_connect_1.sequelize);
//customer
const Customer = (0, customer_1.initCustomerModel)(database_connect_1.sequelize);
const CustomerPayment = (0, customerPayment_1.initCustomerPaymentModel)(database_connect_1.sequelize);
//order
const Order = (0, order_1.initOrderModel)(database_connect_1.sequelize);
const OrderImage = (0, orderImage_1.initOrderImageModel)(database_connect_1.sequelize);
const OrderApproved = (0, orderApproved_1.initOrderApprovedModel)(database_connect_1.sequelize);
const Box = (0, box_1.initBoxModel)(database_connect_1.sequelize);
//planning
const PlanningPaper = (0, planningPaper_1.initPlanningPaperModel)(database_connect_1.sequelize);
const PlanningBox = (0, planningBox_1.initPlanningBoxModel)(database_connect_1.sequelize);
const timeOverflowPlanning = (0, timeOverflowPlanning_1.initTimeOverflowPlanningModel)(database_connect_1.sequelize);
const PlanningBoxTime = (0, planningBoxMachineTime_1.initPlanningBoxTimeModel)(database_connect_1.sequelize);
//paper requirement
const PaperRequirements = (0, paperRequirements_1.initPaperRequirementsModel)(database_connect_1.sequelize);
const PaperRequirementLayers = (0, paper_requirement_layers_1.initPaperRequirementLayersModel)(database_connect_1.sequelize);
//report
const ReportPlanningPaper = (0, reportPlanningPaper_1.initReportPlanningPaperModel)(database_connect_1.sequelize);
const ReportPlanningBox = (0, reportPlanningBox_1.initReportPlanningBoxModel)(database_connect_1.sequelize);
const DailyReportPerformance = (0, dailyReportPerformance_1.initDailyReportModel)(database_connect_1.sequelize);
//scrap
const ScrapReport = (0, scrapReport_1.initScrapReportModel)(database_connect_1.sequelize);
//employee
const EmployeeBasicInfo = (0, employeeBasicInfo_1.initEmployeeBasicInfoModel)(database_connect_1.sequelize);
const EmployeeCompanyInfo = (0, employeeCompanyInfo_1.initEmployeeCompanyInfoModel)(database_connect_1.sequelize);
//QC
const QcSession = (0, qcSession_1.initQcSessionModel)(database_connect_1.sequelize);
const QcCriteria = (0, qcCriteria_1.initQcCriteriaModel)(database_connect_1.sequelize);
const QcSampleResult = (0, qcSampleResult_1.initQcSamepleResultModel)(database_connect_1.sequelize);
//QC Inspection
const QcInspectionPaper = (0, qcInspectionPaper_1.initQcInspectionPaperModel)(database_connect_1.sequelize);
const QcInspectionBox = (0, qcInspectionBox_1.initQcInspectionBoxModel)(database_connect_1.sequelize);
//warehouse
const InboundHistory = (0, inboundHistory_1.initInboundHistoryModel)(database_connect_1.sequelize);
const OutboundHistory = (0, outboundHistory_1.initOutboundHistoryModel)(database_connect_1.sequelize);
const OutboundDetail = (0, outboundDetail_1.initOutboundDetailModel)(database_connect_1.sequelize);
const PaymentAllocation = (0, paymentAllocation_1.initPaymentAllocationModel)(database_connect_1.sequelize);
//inventory
const Inventory = (0, inventory_1.initInventoryModel)(database_connect_1.sequelize);
const InventoryLog = (0, inventoryLog_1.initInventoryLogModel)(database_connect_1.sequelize);
const InventoryTransfers = (0, inventoryTransfers_1.initInventoryTransfersModel)(database_connect_1.sequelize);
const LiquidationInv = (0, liquidationInventory_1.initLiquidationInventoryModel)(database_connect_1.sequelize);
//delivery
const DeliveryRequest = (0, deliveryRequest_1.initDeliveryRequestModel)(database_connect_1.sequelize);
const DeliveryPlan = (0, deliveryPlan_1.initDeliveryPlanModel)(database_connect_1.sequelize);
const DeliveryItem = (0, deliveryItem_1.initDeliveryItemModel)(database_connect_1.sequelize);
//notification
const NotificationModel = (0, notification_1.initNotificationModel)(database_connect_1.sequelize);
const UserNotifications = (0, userNotifications_1.initUserNotificationsModel)(database_connect_1.sequelize);
const models = {
    //admin
    MachinePaper,
    MachineBox,
    WasteNormPaper,
    WasteNormBox,
    WaveCrestCoefficient,
    Vehicle,
    FluteRatio,
    //admin criteria check
    CriteriaPaperCheck,
    CriteriaBoxCheck,
    // admin paper classifications
    Suppliers,
    PaperTypes,
    PaperBasisWeights,
    SupplierPaperCodes,
    PaperClassifications,
    User,
    Product,
    //Customer
    Customer,
    CustomerPayment,
    //order
    Order,
    OrderApproved,
    Box,
    OrderImage,
    //planning
    PlanningPaper,
    PlanningBox,
    timeOverflowPlanning,
    PlanningBoxTime,
    //paper requirement
    PaperRequirements,
    PaperRequirementLayers,
    //report
    ReportPlanningPaper,
    ReportPlanningBox,
    DailyReportPerformance,
    //scrap
    ScrapReport,
    //employee
    EmployeeBasicInfo,
    EmployeeCompanyInfo,
    //QC
    QcCriteria,
    QcSession,
    QcSampleResult,
    //QC Inspection
    QcInspectionPaper,
    QcInspectionBox,
    //warehouse
    InboundHistory,
    OutboundHistory,
    OutboundDetail,
    // Allocation
    PaymentAllocation,
    //inventory
    Inventory,
    InventoryTransfers,
    LiquidationInv,
    InventoryLog,
    //Delivery
    DeliveryRequest,
    DeliveryPlan,
    DeliveryItem,
    //notification
    NotificationModel,
    UserNotifications,
};
// Setup relationships
(0, associations_1.setupAssociations)(models);
exports.default = models;
//# sourceMappingURL=index.js.map