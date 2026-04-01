"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardSettings = exports.inventorySettings = exports.outboundSettings = exports.inboundSettings = exports.reportBoxSettings = exports.reportPaperSettings = exports.planningBoxSettings = exports.planningPaperSettings = exports.ordersSettings = exports.employeesSettings = exports.productsSettings = exports.customersSettings = void 0;
const rule = ["words", "typo", "proximity", "attribute", "sort", "exactness"];
//customer
exports.customersSettings = {
    searchableAttributes: ["customerId", "customerName", "cskh", "phone"],
    sortableAttributes: ["customerSeq"],
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
    searchableAttributes: ["orderId", "customerName", "productName", "QC_box", "price"],
    sortableAttributes: ["orderSortValue"],
    filterableAttributes: ["status", "userId"],
    rankingRules: rule,
};
//planning paper
exports.planningPaperSettings = {
    searchableAttributes: ["orderId", "customerName", "ghepKho"],
    filterableAttributes: ["chooseMachine", "status"],
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
    filterableAttributes: ["chooseMachine"],
    rankingRules: rule,
};
//report box
exports.reportBoxSettings = {
    searchableAttributes: ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"],
    filterableAttributes: ["machine"],
    rankingRules: rule,
};
//inbound history
exports.inboundSettings = {
    searchableAttributes: ["orderId", "customerName", "companyName", "productName"],
    rankingRules: rule,
};
//outbound
exports.outboundSettings = {
    searchableAttributes: ["orderId", "outboundSlipCode", "companyName", "productName"],
    rankingRules: rule,
};
//inventory
exports.inventorySettings = {
    searchableAttributes: ["orderId", "customerName"],
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