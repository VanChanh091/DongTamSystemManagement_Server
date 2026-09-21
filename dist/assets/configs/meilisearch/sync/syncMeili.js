"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDashboardToMeili = exports.syncDeliveryRequestToMeili = exports.syncReportBoxToMeili = exports.syncReportPaperToMeili = exports.syncInventoryToMeili = exports.syncOutboundToMeili = exports.syncInboundToMeili = exports.syncScrapReportToMeili = exports.syncPlanningBoxToMeili = exports.syncPlanningPaperToMeili = exports.syncOrderToMeili = exports.syncEmployeeToMeili = exports.syncProductToMeili = exports.syncCustomerToMeili = exports.resetMeiliIndex = void 0;
const sequelize_1 = require("sequelize");
const user_1 = require("../../../../models/user/user");
const appError_1 = require("../../../../utils/appError");
const order_1 = require("../../../../models/order/order");
const meiliTransformer_1 = require("../meiliTransformer");
const product_1 = require("../../../../models/product/product");
const meilisearch_connect_1 = require("../../connect/meilisearch.connect");
const customer_1 = require("../../../../models/customer/customer");
const orderRepository_1 = require("../../../../repository/orderRepository");
const planningPaper_1 = require("../../../../models/planning/planningPaper");
const reportRepository_1 = require("../../../../repository/reportRepository");
const productRepository_1 = require("../../../../repository/productRepository");
const deliveryRepository_1 = require("../../../../repository/deliveryRepository");
const customerRepository_1 = require("../../../../repository/customerRepository");
const employeeRepository_1 = require("../../../../repository/employeeRepository");
const warehouseRepository_1 = require("../../../../repository/warehouseRepository");
const inventoryRepository_1 = require("../../../../repository/inventoryRepository");
const planningBoxRepository_1 = require("../../../../repository/planning/planningBoxRepository");
const planningPaperRepository_1 = require("../../../../repository/planning/planningPaperRepository");
const scrapReportRepository_1 = require("../../../../repository/scrapReportRepository");
const syncMeiliData = async ({ indexName, primaryKey, data, displayName, isDeleteAll, }) => {
    try {
        if (!isDeleteAll) {
            if (!data || data.length === 0) {
                return null;
            }
        }
        const index = meilisearch_connect_1.meiliClient.index(indexName);
        let task;
        if (isDeleteAll) {
            task = await index.deleteAllDocuments();
        }
        else {
            task = await index.addDocuments(data, { primaryKey });
        }
        // Khai customerId là primary key
        console.log(`🚀 Đang đồng bộ ${data.length} ${displayName}... TaskID: ${task.taskUid}`);
        return task.taskUid;
    }
    catch (error) {
        console.error("❌ Lỗi đồng bộ Meilisearch:", error);
        if (error instanceof appError_1.AppError)
            throw error;
        throw appError_1.AppError.ServerError();
    }
};
//delete or add all data in meilisearch
// export const syncOrDeleteAllDataToMeili = async (isDeleteAll: boolean) => {
//   try {
//   } catch (error) {}
// };
const resetMeiliIndex = async (indexName) => {
    try {
        await meilisearch_connect_1.meiliClient.deleteIndex(indexName);
        console.log(`🗑️ Đã xóa Index: ${indexName}`);
    }
    catch (error) {
        console.log(`Index ${indexName} chưa tồn tại, không cần xóa.`);
    }
};
exports.resetMeiliIndex = resetMeiliIndex;
//sync customer
const syncCustomerToMeili = async (isDeleteAll) => {
    const customers = await customerRepository_1.customerRepository.syncAllCustomersForMeili();
    const flattenData = customers.map(meiliTransformer_1.meiliTransformer.customer);
    return await syncMeiliData({
        data: flattenData,
        indexName: "customers",
        displayName: "customers",
        primaryKey: "customerId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncCustomerToMeili = syncCustomerToMeili;
//sync product
const syncProductToMeili = async (isDeleteAll) => {
    const query = productRepository_1.productRepository.buildProductOptions({});
    const products = await product_1.Product.findAll(query);
    return await syncMeiliData({
        data: products,
        indexName: "products",
        displayName: "products",
        primaryKey: "productId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncProductToMeili = syncProductToMeili;
//sync employee
const syncEmployeeToMeili = async (isDeleteAll) => {
    const employees = await employeeRepository_1.employeeRepository.syncAllEmployeesForMeili();
    const flattenData = employees.map(meiliTransformer_1.meiliTransformer.employee);
    return await syncMeiliData({
        data: flattenData,
        indexName: "employees",
        displayName: "employees",
        primaryKey: "employeeId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncEmployeeToMeili = syncEmployeeToMeili;
//sync order
const syncOrderToMeili = async (isDeleteAll) => {
    const orders = await orderRepository_1.orderRepository.syncAllOrdersForMeili();
    const flattenData = orders.map(meiliTransformer_1.meiliTransformer.order);
    return await syncMeiliData({
        data: flattenData,
        indexName: "orders",
        displayName: "orders",
        primaryKey: "orderSortValue",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncOrderToMeili = syncOrderToMeili;
//sync planning
const syncPlanningPaperToMeili = async (isDeleteAll) => {
    const papers = await planningPaperRepository_1.planningPaperRepository.syncAllPaperToMeili({
        whereCondition: { deliveryPlanned: { [sequelize_1.Op.ne]: "delivered" } },
    });
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.planningPaper);
    return await syncMeiliData({
        data: flattenData,
        indexName: "planningPapers",
        displayName: "planningPapers",
        primaryKey: "planningId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncPlanningPaperToMeili = syncPlanningPaperToMeili;
const syncPlanningBoxToMeili = async (isDeleteAll) => {
    const boxes = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxToMeili({});
    const flattenData = boxes.map(meiliTransformer_1.meiliTransformer.planningBox);
    return await syncMeiliData({
        data: flattenData,
        indexName: "planningBoxes",
        displayName: "planningBoxes",
        primaryKey: "planningBoxId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncPlanningBoxToMeili = syncPlanningBoxToMeili;
//scrap report
const syncScrapReportToMeili = async (isDeleteAll) => {
    const scrapReport = await scrapReportRepository_1.scrapReportRepository.syncAllScrapReportForMeili({});
    const flattenData = scrapReport.map(meiliTransformer_1.meiliTransformer.scrapReport);
    return await syncMeiliData({
        data: flattenData,
        indexName: "scrapReports",
        displayName: "scrapReports",
        primaryKey: "scrapId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncScrapReportToMeili = syncScrapReportToMeili;
//sync inbound & outbound
const syncInboundToMeili = async (isDeleteAll) => {
    const inbounds = await warehouseRepository_1.warehouseRepository.syncAllInboundsForMeili();
    const flattenData = inbounds.map(meiliTransformer_1.meiliTransformer.inbound);
    return await syncMeiliData({
        data: flattenData,
        indexName: "inboundHistories",
        displayName: "inboundHistories",
        primaryKey: "inboundId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncInboundToMeili = syncInboundToMeili;
const syncOutboundToMeili = async (isDeleteAll) => {
    const outbounds = await warehouseRepository_1.warehouseRepository.syncAllOutboundsForMeili();
    const flattenData = outbounds.map(meiliTransformer_1.meiliTransformer.outbound);
    return await syncMeiliData({
        data: flattenData,
        indexName: "outbounds",
        displayName: "outbounds",
        primaryKey: "outboundId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncOutboundToMeili = syncOutboundToMeili;
//sync inventory
const syncInventoryToMeili = async (isDeleteAll) => {
    const inventories = await inventoryRepository_1.inventoryRepository.syncAllInventoryForMeili({
        qtyInventory: { [sequelize_1.Op.ne]: 0 },
    });
    const flattenData = inventories.map(meiliTransformer_1.meiliTransformer.inventory);
    return await syncMeiliData({
        data: flattenData,
        indexName: "inventories",
        displayName: "inventories",
        primaryKey: "inventoryId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncInventoryToMeili = syncInventoryToMeili;
//sync report
const syncReportPaperToMeili = async (isDeleteAll) => {
    const papers = await reportRepository_1.reportRepository.syncAllReportPapersForMeili();
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.reportPaper);
    return await syncMeiliData({
        data: flattenData,
        indexName: "reportPapers",
        displayName: "reportPapers",
        primaryKey: "reportPaperId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncReportPaperToMeili = syncReportPaperToMeili;
const syncReportBoxToMeili = async (isDeleteAll) => {
    const boxes = await reportRepository_1.reportRepository.syncAllReportBoxesForMeili();
    const flattenData = boxes.map(meiliTransformer_1.meiliTransformer.reportBox);
    return await syncMeiliData({
        data: flattenData,
        indexName: "reportBoxes",
        displayName: "reportBoxes",
        primaryKey: "reportBoxId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncReportBoxToMeili = syncReportBoxToMeili;
const syncDeliveryRequestToMeili = async (isDeleteAll) => {
    const requests = await deliveryRepository_1.deliveryRepository.syncAllDeliveryRequestForMeili({
        whereCondition: { status: { [sequelize_1.Op.notIn]: ["scheduled", "cancelled"] } },
    });
    const flattenData = requests.map(meiliTransformer_1.meiliTransformer.deliveryRequest);
    return await syncMeiliData({
        data: flattenData,
        indexName: "deliveryRequest",
        displayName: "deliveryRequest",
        primaryKey: "requestId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncDeliveryRequestToMeili = syncDeliveryRequestToMeili;
//sync dashboard
const syncDashboardToMeili = async (isDeleteAll) => {
    const dashboard = await planningPaper_1.PlanningPaper.findAll({
        attributes: ["planningId", "ghepKho", "chooseMachine", "status"],
        include: [
            {
                model: order_1.Order,
                attributes: ["orderId"],
                include: [
                    { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                    { model: user_1.User, attributes: ["fullName"] },
                ],
            },
        ],
    });
    const flattenData = dashboard.map(meiliTransformer_1.meiliTransformer.dashboard);
    return await syncMeiliData({
        data: flattenData,
        indexName: "dashboard",
        displayName: "dashboard",
        primaryKey: "planningId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncDashboardToMeili = syncDashboardToMeili;
//# sourceMappingURL=syncMeili.js.map