import { Settings } from "meilisearch";

const rule = ["words", "typo", "proximity", "attribute", "sort", "exactness"];

//customer
export const customersSettings: Settings = {
  searchableAttributes: ["customerId", "customerName", "cskh", "phone"],
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
  searchableAttributes: ["orderId", "customerName", "productName", "QC_box", "price"],
  sortableAttributes: ["orderSortValue"],
  rankingRules: rule,
};

//planning paper
export const planningPaperSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "ghepKho"],
  rankingRules: rule,
};

//planning box
export const planningBoxSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "QC_box"],
  rankingRules: rule,
};

//outbound
export const outboundSettings: Settings = {
  searchableAttributes: ["orderId", "outboundSlipCode", "companyName", "productName"],
  rankingRules: rule,
};

//inventory
export const inventorySettings: Settings = {
  searchableAttributes: ["orderId", "customerName"],
  rankingRules: rule,
};

//report paper
export const reportPaperSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dayReported", "shiftManagement"],
  rankingRules: rule,
};

//report box
export const reportBoxSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"],
  rankingRules: rule,
};

//inbound history
export const inboundSettings: Settings = {
  searchableAttributes: ["orderId", "customerName", "companyName", "productName"],
  rankingRules: rule,
};

//dashboard
export const dashboardSettings: Settings = {
  searchableAttributes: ["orderId", "machine", "customerName", "companyName", "username"],
  rankingRules: rule,
};
