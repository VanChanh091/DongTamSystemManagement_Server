"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDashboardToMeili = exports.syncDeliveryRequestToMeili = exports.syncInspectionBoxToMeili = exports.syncInspectionPaperToMeili = exports.syncReportBoxToMeili = exports.syncReportPaperToMeili = exports.syncInventoryToMeili = exports.syncOutboundToMeili = exports.syncInboundToMeili = exports.syncScrapReportToMeili = exports.syncPlanningBoxToMeili = exports.syncPlanningPaperToMeili = exports.syncOrderToMeili = exports.syncEmployeeToMeili = exports.syncProductToMeili = exports.syncCustomerToMeili = exports.resetMeiliIndex = exports.parseSyncOptions = void 0;
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
const scrapReportRepository_1 = require("../../../../repository/scrapReportRepository");
const planningBoxRepository_1 = require("../../../../repository/planning/planningBoxRepository");
const planningPaperRepository_1 = require("../../../../repository/planning/planningPaperRepository");
const qcRepository_1 = require("../../../../repository/qcRepository");
const parseSyncOptions = (options) => {
    if (typeof options === "boolean") {
        return { isDeleteAll: options, isResync: false };
    }
    return {
        isDeleteAll: Boolean(options?.isDeleteAll),
        isResync: Boolean(options?.isResync),
    };
};
exports.parseSyncOptions = parseSyncOptions;
const syncMeiliData = async ({ indexName, primaryKey, data, displayName, isDeleteAll, isResync, }) => {
    try {
        const index = meilisearch_connect_1.meiliClient.index(indexName);
        if (isDeleteAll) {
            const task = await index.deleteAllDocuments();
            console.log(`🗑️ Đã gửi lệnh xóa toàn bộ dữ liệu của ${displayName}... TaskID: ${task.taskUid}`);
            return task.taskUid;
        }
        if (isResync) {
            console.log(`🧹 Đang làm sạch toàn bộ dữ liệu cũ của ${displayName}...`);
            const deleteTask = await index.deleteAllDocuments();
            await meilisearch_connect_1.meiliClient.tasks.waitForTask(deleteTask.taskUid);
            if (!data || data.length === 0) {
                console.log(`ℹ️ Không có dữ liệu mới để đồng bộ cho ${displayName}.`);
                return deleteTask.taskUid;
            }
            const task = await index.addDocuments(data, { primaryKey });
            console.log(`🚀 Đã đồng bộ lại ${data.length} ${displayName}... TaskID: ${task.taskUid}`);
            return task.taskUid;
        }
        else {
            if (!data || data.length === 0) {
                return null;
            }
            const task = await index.addDocuments(data, { primaryKey });
            console.log(`🚀 Đang đồng bộ ${data.length} ${displayName}... TaskID: ${task.taskUid}`);
            return task.taskUid;
        }
    }
    catch (error) {
        console.error("❌ Lỗi đồng bộ Meilisearch:", error);
        if (error instanceof appError_1.AppError)
            throw error;
        throw appError_1.AppError.ServerError();
    }
};
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
const syncCustomerToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const customers = await customerRepository_1.customerRepository.syncAllCustomersForMeili();
    const flattenData = customers.map(meiliTransformer_1.meiliTransformer.customer);
    return await syncMeiliData({
        data: flattenData,
        indexName: "customers",
        displayName: "customers",
        primaryKey: "customerId",
        isDeleteAll,
        isResync,
    });
};
exports.syncCustomerToMeili = syncCustomerToMeili;
//sync product
const syncProductToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const query = productRepository_1.productRepository.buildProductOptions({});
    const products = await product_1.Product.findAll(query);
    return await syncMeiliData({
        data: products,
        indexName: "products",
        displayName: "products",
        primaryKey: "productId",
        isDeleteAll,
        isResync,
    });
};
exports.syncProductToMeili = syncProductToMeili;
//sync employee
const syncEmployeeToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const employees = await employeeRepository_1.employeeRepository.syncAllEmployeesForMeili();
    const flattenData = employees.map(meiliTransformer_1.meiliTransformer.employee);
    return await syncMeiliData({
        data: flattenData,
        indexName: "employees",
        displayName: "employees",
        primaryKey: "employeeId",
        isDeleteAll,
        isResync,
    });
};
exports.syncEmployeeToMeili = syncEmployeeToMeili;
//sync order
const syncOrderToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const orders = await orderRepository_1.orderRepository.syncAllOrdersForMeili();
    const flattenData = orders.map(meiliTransformer_1.meiliTransformer.order);
    return await syncMeiliData({
        data: flattenData,
        indexName: "orders",
        displayName: "orders",
        primaryKey: "orderSortValue",
        isDeleteAll,
        isResync,
    });
};
exports.syncOrderToMeili = syncOrderToMeili;
//sync planning
const syncPlanningPaperToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const papers = await planningPaperRepository_1.planningPaperRepository.syncAllPaperToMeili({
        whereCondition: { deliveryPlanned: { [sequelize_1.Op.ne]: "delivered" } },
    });
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.planningPaper);
    return await syncMeiliData({
        data: flattenData,
        indexName: "planningPapers",
        displayName: "planningPapers",
        primaryKey: "planningId",
        isDeleteAll,
        isResync,
    });
};
exports.syncPlanningPaperToMeili = syncPlanningPaperToMeili;
const syncPlanningBoxToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const boxes = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxToMeili({});
    const flattenData = boxes.map(meiliTransformer_1.meiliTransformer.planningBox);
    return await syncMeiliData({
        data: flattenData,
        indexName: "planningBoxes",
        displayName: "planningBoxes",
        primaryKey: "planningBoxId",
        isDeleteAll,
        isResync,
    });
};
exports.syncPlanningBoxToMeili = syncPlanningBoxToMeili;
//scrap report
const syncScrapReportToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const scrapReport = await scrapReportRepository_1.scrapReportRepository.syncAllScrapReportForMeili({});
    const flattenData = scrapReport.map(meiliTransformer_1.meiliTransformer.scrapReport);
    return await syncMeiliData({
        data: flattenData,
        indexName: "scrapReports",
        displayName: "scrapReports",
        primaryKey: "scrapId",
        isDeleteAll,
        isResync,
    });
};
exports.syncScrapReportToMeili = syncScrapReportToMeili;
//sync inbound & outbound
const syncInboundToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const inbounds = await warehouseRepository_1.warehouseRepository.syncAllInboundsForMeili();
    const flattenData = inbounds.map(meiliTransformer_1.meiliTransformer.inbound);
    return await syncMeiliData({
        data: flattenData,
        indexName: "inboundHistories",
        displayName: "inboundHistories",
        primaryKey: "inboundId",
        isDeleteAll,
        isResync,
    });
};
exports.syncInboundToMeili = syncInboundToMeili;
const syncOutboundToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const outbounds = await warehouseRepository_1.warehouseRepository.syncAllOutboundsForMeili();
    const flattenData = outbounds.map(meiliTransformer_1.meiliTransformer.outbound);
    return await syncMeiliData({
        data: flattenData,
        indexName: "outbounds",
        displayName: "outbounds",
        primaryKey: "outboundId",
        isDeleteAll,
        isResync,
    });
};
exports.syncOutboundToMeili = syncOutboundToMeili;
//sync inventory
const syncInventoryToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const inventories = await inventoryRepository_1.inventoryRepository.syncAllInventoryForMeili({
        qtyInventory: { [sequelize_1.Op.ne]: 0 },
    });
    const flattenData = inventories.map(meiliTransformer_1.meiliTransformer.inventory);
    return await syncMeiliData({
        data: flattenData,
        indexName: "inventories",
        displayName: "inventories",
        primaryKey: "inventoryId",
        isDeleteAll,
        isResync,
    });
};
exports.syncInventoryToMeili = syncInventoryToMeili;
//sync report
const syncReportPaperToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const papers = await reportRepository_1.reportRepository.syncAllReportPapersForMeili();
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.reportPaper);
    return await syncMeiliData({
        data: flattenData,
        indexName: "reportPapers",
        displayName: "reportPapers",
        primaryKey: "reportPaperId",
        isDeleteAll,
        isResync,
    });
};
exports.syncReportPaperToMeili = syncReportPaperToMeili;
const syncReportBoxToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const boxes = await reportRepository_1.reportRepository.syncAllReportBoxesForMeili();
    const flattenData = boxes.map(meiliTransformer_1.meiliTransformer.reportBox);
    return await syncMeiliData({
        data: flattenData,
        indexName: "reportBoxes",
        displayName: "reportBoxes",
        primaryKey: "reportBoxId",
        isDeleteAll,
        isResync,
    });
};
exports.syncReportBoxToMeili = syncReportBoxToMeili;
//sync inspection paper & box
const syncInspectionPaperToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const papers = await qcRepository_1.qcRepository.syncAllInspecPaperForMeili();
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.inspectionPaper);
    return await syncMeiliData({
        data: flattenData,
        indexName: "inspection_papers",
        displayName: "inspection_papers",
        primaryKey: "inspecPaperId",
        isDeleteAll,
        isResync,
    });
};
exports.syncInspectionPaperToMeili = syncInspectionPaperToMeili;
const syncInspectionBoxToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const boxes = await qcRepository_1.qcRepository.syncAllInspecBoxForMeili();
    const flattenData = boxes.map(meiliTransformer_1.meiliTransformer.inspectionBox);
    return await syncMeiliData({
        data: flattenData,
        indexName: "inspection_boxes",
        displayName: "inspection_boxes",
        primaryKey: "inspecBoxId",
        isDeleteAll,
        isResync,
    });
};
exports.syncInspectionBoxToMeili = syncInspectionBoxToMeili;
//sync delivery
const syncDeliveryRequestToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
    const requests = await deliveryRepository_1.deliveryRepository.syncAllDeliveryRequestForMeili({
        whereCondition: { status: { [sequelize_1.Op.notIn]: ["scheduled", "cancelled"] } },
    });
    const flattenData = requests.map(meiliTransformer_1.meiliTransformer.deliveryRequest);
    return await syncMeiliData({
        data: flattenData,
        indexName: "deliveryRequest",
        displayName: "deliveryRequest",
        primaryKey: "requestId",
        isDeleteAll,
        isResync,
    });
};
exports.syncDeliveryRequestToMeili = syncDeliveryRequestToMeili;
//sync dashboard
const syncDashboardToMeili = async (options) => {
    const { isDeleteAll, isResync } = (0, exports.parseSyncOptions)(options);
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
        isDeleteAll,
        isResync,
    });
};
exports.syncDashboardToMeili = syncDashboardToMeili;
//# sourceMappingURL=syncMeili.js.map