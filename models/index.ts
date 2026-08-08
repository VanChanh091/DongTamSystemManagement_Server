import { sequelize } from "../assets/configs/connect/database.connect";
import { initCriteriaBoxCheckModel } from "./admin/criteriaCheck/criteriaBoxCheck";
import { initCriteriaPaperCheckModel } from "./admin/criteriaCheck/criteriaPaperCheck";
import { initFluteRatioCoefficientModel } from "./admin/fluteRatio";
import { initMachineBoxModel } from "./admin/machineBox";
import { initMachinePaperModel } from "./admin/machinePaper";
import { initVehicleModel } from "./admin/vehicle";
import { initWasteNormBoxModel } from "./admin/wasteNormBox";
import { initWasteNormPaperModel } from "./admin/wasteNormPaper";
import { initWaveCrestCoefficientModel } from "./admin/waveCrestCoefficient";
import { setupAssociations } from "./associations";
import { initCustomerModel } from "./customer/customer";
import { initCustomerPaymentModel } from "./customer/customerPayment";
import { initDeliveryItemModel } from "./delivery/deliveryItem";
import { initDeliveryPlanModel } from "./delivery/deliveryPlan";
import { initDeliveryRequestModel } from "./delivery/deliveryRequest";
import { initEmployeeBasicInfoModel } from "./employee/employeeBasicInfo";
import { initEmployeeCompanyInfoModel } from "./employee/employeeCompanyInfo";
import { initNotificationModel } from "./notification/notification";
import { initUserNotificationsModel } from "./notification/userNotifications";
import { initBoxModel } from "./order/box";
import { initOrderModel } from "./order/order";
import { initOrderApprovedModel } from "./order/orderApproved";
import { initOrderImageModel } from "./order/orderImage";
import { initPlanningBoxModel } from "./planning/planningBox";
import { initPlanningBoxTimeModel } from "./planning/planningBoxMachineTime";
import { initPlanningPaperModel } from "./planning/planningPaper";
import { initTimeOverflowPlanningModel } from "./planning/timeOverflowPlanning";
import { initProductModel } from "./product/product";
import { initQcCriteriaModel } from "./qualityControl/qcCriteria";
import { initQcInspectionBoxModel } from "./qualityControl/qcInspection/qcInspectionBox";
import { initQcInspectionPaperModel } from "./qualityControl/qcInspection/qcInspectionPaper";
import { initQcSamepleResultModel } from "./qualityControl/qcSampleResult";
import { initQcSessionModel } from "./qualityControl/qcSession";
import { initDailyReportModel } from "./report/dailyReportPerformance";
import { initReportPlanningBoxModel } from "./report/reportPlanningBox";
import { initReportPlanningPaperModel } from "./report/reportPlanningPaper";
import { initScrapReportModel } from "./scrap/scrapReport";
import { initUserModel } from "./user/user";
import { initInboundHistoryModel } from "./warehouse/inboundHistory";
import { initInventoryModel } from "./warehouse/inventory/inventory";
import { initInventoryLogModel } from "./warehouse/inventory/inventoryLog";
import { initInventoryTransfersModel } from "./warehouse/inventory/inventoryTransfers";
import { initLiquidationInventoryModel } from "./warehouse/inventory/liquidationInventory";
import { initOutboundDetailModel } from "./warehouse/outbound/outboundDetail";
import { initOutboundHistoryModel } from "./warehouse/outbound/outboundHistory";
import { initPaymentAllocationModel } from "./warehouse/payment/paymentAllocation";

//admin
const MachinePaper = initMachinePaperModel(sequelize);
const MachineBox = initMachineBoxModel(sequelize);
const WasteNormPaper = initWasteNormPaperModel(sequelize);
const WasteNormBox = initWasteNormBoxModel(sequelize);
const WaveCrestCoefficient = initWaveCrestCoefficientModel(sequelize);
const Vehicle = initVehicleModel(sequelize);
const FluteRatio = initFluteRatioCoefficientModel(sequelize);

//admin criteria check
const CriteriaPaperCheck = initCriteriaPaperCheckModel(sequelize);
const CriteriaBoxCheck = initCriteriaBoxCheckModel(sequelize);

//other
const User = initUserModel(sequelize);
const Product = initProductModel(sequelize);

//customer
const Customer = initCustomerModel(sequelize);
const CustomerPayment = initCustomerPaymentModel(sequelize);

//order
const Order = initOrderModel(sequelize);
const OrderImage = initOrderImageModel(sequelize);
const OrderApproved = initOrderApprovedModel(sequelize);
const Box = initBoxModel(sequelize);

//planning
const PlanningPaper = initPlanningPaperModel(sequelize);
const PlanningBox = initPlanningBoxModel(sequelize);
const timeOverflowPlanning = initTimeOverflowPlanningModel(sequelize);
const PlanningBoxTime = initPlanningBoxTimeModel(sequelize);

//report
const ReportPlanningPaper = initReportPlanningPaperModel(sequelize);
const ReportPlanningBox = initReportPlanningBoxModel(sequelize);
const DailyReportPerformance = initDailyReportModel(sequelize);

//scrap
const ScrapReport = initScrapReportModel(sequelize);

//employee
const EmployeeBasicInfo = initEmployeeBasicInfoModel(sequelize);
const EmployeeCompanyInfo = initEmployeeCompanyInfoModel(sequelize);

//QC
const QcSession = initQcSessionModel(sequelize);
const QcCriteria = initQcCriteriaModel(sequelize);
const QcSampleResult = initQcSamepleResultModel(sequelize);

//QC Inspection
const QcInspectionPaper = initQcInspectionPaperModel(sequelize);
const QcInspectionBox = initQcInspectionBoxModel(sequelize);

//warehouse
const InboundHistory = initInboundHistoryModel(sequelize);
const OutboundHistory = initOutboundHistoryModel(sequelize);
const OutboundDetail = initOutboundDetailModel(sequelize);
const PaymentAllocation = initPaymentAllocationModel(sequelize);

//inventory
const Inventory = initInventoryModel(sequelize);
const InventoryLog = initInventoryLogModel(sequelize);
const InventoryTransfers = initInventoryTransfersModel(sequelize);
const LiquidationInv = initLiquidationInventoryModel(sequelize);

//delivery
const DeliveryRequest = initDeliveryRequestModel(sequelize);
const DeliveryPlan = initDeliveryPlanModel(sequelize);
const DeliveryItem = initDeliveryItemModel(sequelize);

//notification
const NotificationModel = initNotificationModel(sequelize);
const UserNotifications = initUserNotificationsModel(sequelize);

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
setupAssociations(models);

export default models;
