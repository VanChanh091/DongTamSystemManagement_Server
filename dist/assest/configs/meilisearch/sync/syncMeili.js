"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDashboardToMeili = exports.syncReportBoxToMeili = exports.syncReportPaperToMeili = exports.syncInventoryToMeili = exports.syncOutboundToMeili = exports.syncInboundToMeili = exports.syncPlanningBoxToMeili = exports.syncPlanningPaperToMeili = exports.syncOrderToMeili = exports.syncEmployeeToMeili = exports.syncProductToMeili = exports.syncCustomerToMeili = exports.resetMeiliIndex = void 0;
const user_1 = require("../../../../models/user/user");
const appError_1 = require("../../../../utils/appError");
const order_1 = require("../../../../models/order/order");
const meiliTransformer_1 = require("../meiliTransformer");
const product_1 = require("../../../../models/product/product");
const meilisearch_connect_1 = require("../../connect/meilisearch.connect");
const customer_1 = require("../../../../models/customer/customer");
const inventory_1 = require("../../../../models/warehouse/inventory");
const planningBox_1 = require("../../../../models/planning/planningBox");
const qcSession_1 = require("../../../../models/qualityControl/qcSession");
const planningPaper_1 = require("../../../../models/planning/planningPaper");
const outboundDetail_1 = require("../../../../models/warehouse/outboundDetail");
const productRepository_1 = require("../../../../repository/productRepository");
const inboundHistory_1 = require("../../../../models/warehouse/inboundHistory");
const outboundHistory_1 = require("../../../../models/warehouse/outboundHistory");
const reportPlanningBox_1 = require("../../../../models/report/reportPlanningBox");
const employeeBasicInfo_1 = require("../../../../models/employee/employeeBasicInfo");
const reportPlanningPaper_1 = require("../../../../models/report/reportPlanningPaper");
const employeeCompanyInfo_1 = require("../../../../models/employee/employeeCompanyInfo");
const planningBoxRepository_1 = require("../../../../repository/planning/planningBoxRepository");
const syncMeiliData = async ({ indexName, primaryKey, data, displayName, isDeleteAll, }) => {
    try {
        if (!data || data.length === 0) {
            throw appError_1.AppError.NotFound(`No ${displayName} found to sync`, `SYNC_${indexName.toUpperCase()}_NOT_FOUND`);
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
    const customers = await customer_1.Customer.findAll({
        attributes: ["customerId", "customerName", "companyName", "cskh", "phone", "customerSeq"],
        order: [["customerSeq", "ASC"]],
    });
    return syncMeiliData({
        data: customers,
        indexName: "customers",
        displayName: "customers",
        primaryKey: "customerId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncCustomerToMeili = syncCustomerToMeili;
//sync product
const syncProductToMeili = async (isDeleteAll) => {
    const { rows } = await productRepository_1.productRepository.findProductByPage({});
    return syncMeiliData({
        data: rows,
        indexName: "products",
        displayName: "products",
        primaryKey: "productId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncProductToMeili = syncProductToMeili;
//sync employee
const syncEmployeeToMeili = async (isDeleteAll) => {
    const employees = await employeeBasicInfo_1.EmployeeBasicInfo.findAll({
        attributes: ["employeeId", "fullName", "phoneNumber"],
        include: [
            {
                model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                as: "companyInfo",
                attributes: ["employeeCode", "status"],
            },
        ],
        order: [["employeeId", "ASC"]],
    });
    const flattenData = employees.map(meiliTransformer_1.meiliTransformer.employee);
    return syncMeiliData({
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
    const orders = await order_1.Order.findAll({
        attributes: ["orderId", "flute", "QC_box", "price", "status", "userId", "orderSortValue"],
        include: [
            { model: customer_1.Customer, attributes: ["customerName"] },
            { model: product_1.Product, attributes: ["productName"] },
        ],
    });
    const flattenData = orders.map(meiliTransformer_1.meiliTransformer.order);
    return syncMeiliData({
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
    const papers = await planningPaper_1.PlanningPaper.findAll({
        attributes: ["planningId", "ghepKho", "orderId", "chooseMachine", "status"],
        include: [
            {
                model: order_1.Order,
                include: [
                    { model: customer_1.Customer, attributes: ["customerName"] },
                    { model: product_1.Product, attributes: ["productName"] },
                ],
            },
        ],
    });
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.planningPaper);
    return syncMeiliData({
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
    return syncMeiliData({
        data: flattenData,
        indexName: "planningBoxes",
        displayName: "planningBoxes",
        primaryKey: "planningBoxId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncPlanningBoxToMeili = syncPlanningBoxToMeili;
//sync inbound & outbound
const syncInboundToMeili = async (isDeleteAll) => {
    const inbounds = await inboundHistory_1.InboundHistory.findAll({
        attributes: ["inboundId", "dateInbound"],
        include: [
            {
                model: order_1.Order,
                attributes: ["orderId"],
                include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
            },
            { model: qcSession_1.QcSession, attributes: ["checkedBy"] },
        ],
    });
    const flattenData = inbounds.map(meiliTransformer_1.meiliTransformer.inbound);
    return syncMeiliData({
        data: flattenData,
        indexName: "inboundHistories",
        displayName: "inboundHistories",
        primaryKey: "inboundId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncInboundToMeili = syncInboundToMeili;
const syncOutboundToMeili = async (isDeleteAll) => {
    const outbounds = await outboundHistory_1.OutboundHistory.findAll({
        attributes: ["outboundId", "outboundSlipCode", "dateOutbound"],
        include: [
            {
                model: outboundDetail_1.OutboundDetail,
                as: "detail",
                attributes: ["outboundDetailId"],
                include: [
                    {
                        model: order_1.Order,
                        attributes: ["orderId"],
                        include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                    },
                ],
            },
        ],
    });
    const flattenData = outbounds.map(meiliTransformer_1.meiliTransformer.outbound);
    return syncMeiliData({
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
    const inventories = await inventory_1.Inventory.findAll({
        attributes: ["inventoryId"],
        include: [
            {
                model: order_1.Order,
                attributes: ["orderId"],
                include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
            },
        ],
    });
    const flattenData = inventories.map(meiliTransformer_1.meiliTransformer.inventory);
    return syncMeiliData({
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
    const papers = await reportPlanningPaper_1.ReportPlanningPaper.findAll({
        attributes: ["reportPaperId", "dayReport", "shiftManagement"],
        include: [
            {
                model: planningPaper_1.PlanningPaper,
                attributes: ["planningId", "chooseMachine"],
                include: [
                    {
                        model: order_1.Order,
                        attributes: ["orderId"],
                        include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                    },
                ],
            },
        ],
    });
    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.reportPaper);
    console.log(flattenData[0]);
    return syncMeiliData({
        data: flattenData,
        indexName: "reportPapers",
        displayName: "reportPapers",
        primaryKey: "reportPaperId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncReportPaperToMeili = syncReportPaperToMeili;
const syncReportBoxToMeili = async (isDeleteAll) => {
    const boxes = await reportPlanningBox_1.ReportPlanningBox.findAll({
        attributes: ["reportBoxId", "dayReport", "shiftManagement", "machine"],
        include: [
            {
                model: planningBox_1.PlanningBox,
                attributes: ["planningBoxId"],
                include: [
                    {
                        model: order_1.Order,
                        attributes: ["orderId", "QC_box"],
                        include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                    },
                ],
            },
        ],
    });
    const flattenData = boxes.map(meiliTransformer_1.meiliTransformer.reportBox);
    console.log(flattenData[0]);
    return syncMeiliData({
        data: flattenData,
        indexName: "reportBoxes",
        displayName: "reportBoxes",
        primaryKey: "reportBoxId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncReportBoxToMeili = syncReportBoxToMeili;
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
    return syncMeiliData({
        data: flattenData,
        indexName: "dashboard",
        displayName: "dashboard",
        primaryKey: "planningId",
        isDeleteAll: isDeleteAll,
    });
};
exports.syncDashboardToMeili = syncDashboardToMeili;
//# sourceMappingURL=syncMeili.js.map