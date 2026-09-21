"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardSettings = exports.deliveryRequestSettings = exports.inventorySettings = exports.outboundSettings = exports.inboundSettings = exports.reportBoxSettings = exports.scrapReportSettings = exports.reportPaperSettings = exports.planningBoxSettings = exports.planningPaperSettings = exports.ordersSettings = exports.employeesSettings = exports.productsSettings = exports.customersSettings = void 0;
const rule = ["words", "typo", "proximity", "attribute", "sort", "exactness"];
//customer
exports.customersSettings = {
    searchableAttributes: ["customerId", "customerName", "cskh", "phone", "createdAt"],
    sortableAttributes: ["customerSeq"],
    filterableAttributes: ["createdAt"],
    rankingRules: rule,
};
//product
exports.productsSettings = {
    searchableAttributes: ["productId", "productName"],
    sortableAttributes: ["productSeq"],
    rankingRules: rule,
};
//employee
exports.employeesSettings = {
    searchableAttributes: ["fullName", "phoneNumber", "employeeCode", "status"],
    sortableAttributes: ["employeeId"],
    rankingRules: rule,
};
//order
exports.ordersSettings = {
    searchableAttributes: [
        "orderId",
        "customerName",
        "productName",
        "QC_box",
        "dayReceiveOrder",
        "fullName",
    ],
    filterableAttributes: ["status", "userId", "dayReceiveOrder"],
    sortableAttributes: ["orderSortValue"],
    rankingRules: rule,
};
//planning paper
exports.planningPaperSettings = {
    searchableAttributes: ["orderId", "customerName", "ghepKho"],
    filterableAttributes: ["chooseMachine", "status", "deliveryPlanned", "userId"],
    rankingRules: rule,
};
//planning box
exports.planningBoxSettings = {
    searchableAttributes: ["orderId", "customerName", "QC_box"],
    filterableAttributes: ["boxTimes.machine", "boxTimes.status"],
    rankingRules: rule,
};
//report paper
exports.reportPaperSettings = {
    searchableAttributes: ["orderId", "customerName", "dayReported", "shiftManagement"],
    filterableAttributes: ["chooseMachine", "dayReported"],
    sortableAttributes: ["dayReported"],
    rankingRules: rule,
};
//scrap report
exports.scrapReportSettings = {
    searchableAttributes: ["scrapId", "reportedBy", "reportedAt"],
    filterableAttributes: ["status"],
    sortableAttributes: ["reportedAt"],
    rankingRules: rule,
};
//report box
exports.reportBoxSettings = {
    searchableAttributes: ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"],
    filterableAttributes: ["machine", "dayReported"],
    sortableAttributes: ["dayReported"],
    rankingRules: rule,
};
//inbound history
exports.inboundSettings = {
    searchableAttributes: ["orderId", "customerName", "dateInbound", "checkedBy"],
    filterableAttributes: ["dateInbound"],
    sortableAttributes: ["dateInbound"],
    rankingRules: rule,
};
//outbound
exports.outboundSettings = {
    searchableAttributes: ["dateOutbound", "outboundSlipCode", "customerName", "status"],
    filterableAttributes: ["status", "dateOutbound"],
    sortableAttributes: ["outboundId"],
    rankingRules: rule,
};
//inventory
exports.inventorySettings = {
    searchableAttributes: ["orderId", "customerName", "fullName"],
    filterableAttributes: ["qtyInventory"],
    rankingRules: rule,
};
//delivery
exports.deliveryRequestSettings = {
    searchableAttributes: ["orderId", "customerName", "status", "fullName"],
    filterableAttributes: ["status"],
    rankingRules: rule,
};
//dashboard
exports.dashboardSettings = {
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
//# sourceMappingURL=meilisearch.config.js.map