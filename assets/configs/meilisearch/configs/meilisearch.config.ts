import { Settings } from "meilisearch";

const rule = ["words", "typo", "proximity", "attribute", "sort", "exactness"];

//customer
export const customersSettings: Settings = {
  searchableAttributes: ["customerId", "customerName", "cskh", "phone", "createdAt"],
  sortableAttributes: ["customerSeq"],
  filterableAttributes: ["createdAt"],
  rankingRules: rule,
};

//product
export const productsSettings: Settings = {
  searchableAttributes: ["productId", "productName"],
  sortableAttributes: ["productSeq"],
  rankingRules: rule,
};

//employee
export const employeesSettings: Settings = {
  searchableAttributes: ["fullName", "phoneNumber", "employeeCode", "status"],
  sortableAttributes: ["employeeId"],
  rankingRules: rule,
};

//order
export const ordersSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "productName", "QC_box", "dayReceiveOrder"],
  filterableAttributes: ["status", "userId", "dayReceiveOrder"],
  sortableAttributes: ["orderSortValue"],
  rankingRules: rule,
};

//planning paper
export const planningPaperSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "ghepKho"],
  filterableAttributes: ["chooseMachine", "status", "deliveryPlanned", "userId"],
  rankingRules: rule,
};

//planning box
export const planningBoxSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "QC_box"],
  filterableAttributes: ["boxTimes.machine", "boxTimes.status"],
  rankingRules: rule,
};

//report paper
export const reportPaperSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dayReported", "shiftManagement"],
  filterableAttributes: ["chooseMachine", "dayReported"],
  sortableAttributes: ["dayReported"],
  rankingRules: rule,
};

//scrap report
export const scrapReportSettings: Settings = {
  searchableAttributes: ["scrapId", "reportedBy", "reportedAt"],
  filterableAttributes: ["status"],
  sortableAttributes: ["reportedAt"],
  rankingRules: rule,
};

//report box
export const reportBoxSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"],
  filterableAttributes: ["machine", "dayReported"],
  sortableAttributes: ["dayReported"],
  rankingRules: rule,
};

//inbound history
export const inboundSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dateInbound", "checkedBy"],
  filterableAttributes: ["dateInbound"],
  sortableAttributes: ["dateInbound"],
  rankingRules: rule,
};

//outbound
export const outboundSettings: Settings = {
  searchableAttributes: ["dateOutbound", "outboundSlipCode", "customerName", "status"],
  filterableAttributes: ["status", "dateOutbound"],
  sortableAttributes: ["outboundId"],
  rankingRules: rule,
};

//inventory
export const inventorySettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "fullName"],
  filterableAttributes: ["qtyInventory"],
  rankingRules: rule,
};

//delivery
export const deliveryRequestSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "status", "fullName"],
  filterableAttributes: ["status"],
  rankingRules: rule,
};

//dashboard
export const dashboardSettings: Settings = {
  searchableAttributes: [
    "orderId",
    "ghepKho",
    "chooseMachine",
    "customerName",
    "companyName",
    "fullName",
  ],
  filterableAttributes: ["status"],
  rankingRules: rule,
};
