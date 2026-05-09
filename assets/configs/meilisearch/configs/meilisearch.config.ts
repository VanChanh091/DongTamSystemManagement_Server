import { Settings } from "meilisearch";

const rule = ["words", "typo", "proximity", "attribute", "sort", "exactness"];

//customer
export const customersSettings: Settings = {
  searchableAttributes: ["customerId", "customerName", "cskh", "phone", "dayCreated"],
  sortableAttributes: ["customerSeq"],
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
  sortableAttributes: ["orderSortValue"],
  filterableAttributes: ["status", "userId", "dayReceiveOrder"],
  rankingRules: rule,
};

//planning paper
export const planningPaperSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "ghepKho"],
  filterableAttributes: ["chooseMachine", "status"],
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
  filterableAttributes: ["chooseMachine"],
  rankingRules: rule,
};

//report box
export const reportBoxSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"],
  filterableAttributes: ["machine"],
  rankingRules: rule,
};

//inbound history
export const inboundSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dateInbound", "checkedBy"],
  rankingRules: rule,
};

//inventory
export const inventorySettings: Settings = {
  searchableAttributes: ["orderId", "customerName"],
  filterableAttributes: ["qtyInventory"],
  rankingRules: rule,
};

//outbound
export const outboundSettings: Settings = {
  searchableAttributes: ["dateOutbound", "outboundSlipCode", "customerName", "status"],
  filterableAttributes: ["status"],
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
