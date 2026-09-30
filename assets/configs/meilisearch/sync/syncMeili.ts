import { Op } from "sequelize";
import { User } from "../../../../models/user/user";
import { AppError } from "../../../../utils/appError";
import { Order } from "../../../../models/order/order";
import { meiliTransformer } from "../meiliTransformer";
import { Product } from "../../../../models/product/product";
import { meiliClient } from "../../connect/meilisearch.connect";
import { Customer } from "../../../../models/customer/customer";
import { orderRepository } from "../../../../repository/orderRepository";
import { PlanningPaper } from "../../../../models/planning/planningPaper";
import { reportRepository } from "../../../../repository/reportRepository";
import { productRepository } from "../../../../repository/productRepository";
import { deliveryRepository } from "../../../../repository/deliveryRepository";
import { customerRepository } from "../../../../repository/customerRepository";
import { employeeRepository } from "../../../../repository/employeeRepository";
import { warehouseRepository } from "../../../../repository/warehouseRepository";
import { inventoryRepository } from "../../../../repository/inventoryRepository";
import { scrapReportRepository } from "../../../../repository/scrapReportRepository";
import { planningBoxRepository } from "../../../../repository/planning/planningBoxRepository";
import { planningPaperRepository } from "../../../../repository/planning/planningPaperRepository";
import { qcRepository } from "../../../../repository/qcRepository";

interface SyncMeiliData {
  data: any[];
  indexName: string;
  primaryKey: string;
  displayName: string;
  isDeleteAll?: boolean;
  isResync?: boolean;
}

export type SyncOptions = boolean | { isDeleteAll?: boolean; isResync?: boolean };

export const parseSyncOptions = (options?: SyncOptions) => {
  if (typeof options === "boolean") {
    return { isDeleteAll: options, isResync: false };
  }
  return {
    isDeleteAll: Boolean(options?.isDeleteAll),
    isResync: Boolean(options?.isResync),
  };
};

const syncMeiliData = async ({
  indexName,
  primaryKey,
  data,
  displayName,
  isDeleteAll,
  isResync,
}: SyncMeiliData) => {
  try {
    const index = meiliClient.index(indexName);

    if (isDeleteAll) {
      const task = await index.deleteAllDocuments();
      console.log(`🗑️ Đã gửi lệnh xóa toàn bộ dữ liệu của ${displayName}... TaskID: ${task.taskUid}`);
      return task.taskUid;
    }

    if (isResync) {
      console.log(`🧹 Đang làm sạch toàn bộ dữ liệu cũ của ${displayName}...`);
      const deleteTask = await index.deleteAllDocuments();
      await meiliClient.tasks.waitForTask(deleteTask.taskUid);

      if (!data || data.length === 0) {
        console.log(`ℹ️ Không có dữ liệu mới để đồng bộ cho ${displayName}.`);
        return deleteTask.taskUid;
      }

      const task = await index.addDocuments(data, { primaryKey });
      console.log(`🚀 Đã đồng bộ lại ${data.length} ${displayName}... TaskID: ${task.taskUid}`);
      return task.taskUid;
    } else {
      if (!data || data.length === 0) {
        return null;
      }
      const task = await index.addDocuments(data, { primaryKey });
      console.log(`🚀 Đang đồng bộ ${data.length} ${displayName}... TaskID: ${task.taskUid}`);
      return task.taskUid;
    }
  } catch (error) {
    console.error("❌ Lỗi đồng bộ Meilisearch:", error);
    if (error instanceof AppError) throw error;
    throw AppError.ServerError();
  }
};

export const resetMeiliIndex = async (indexName: string) => {
  try {
    await meiliClient.deleteIndex(indexName);
    console.log(`🗑️ Đã xóa Index: ${indexName}`);
  } catch (error) {
    console.log(`Index ${indexName} chưa tồn tại, không cần xóa.`);
  }
};

//sync customer
export const syncCustomerToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const customers = await customerRepository.syncAllCustomersForMeili();
  const flattenData = customers.map(meiliTransformer.customer);

  return await syncMeiliData({
    data: flattenData,
    indexName: "customers",
    displayName: "customers",
    primaryKey: "customerId",
    isDeleteAll,
    isResync,
  });
};

//sync product
export const syncProductToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const query = productRepository.buildProductOptions({});
  const products = await Product.findAll(query);

  return await syncMeiliData({
    data: products,
    indexName: "products",
    displayName: "products",
    primaryKey: "productId",
    isDeleteAll,
    isResync,
  });
};

//sync employee
export const syncEmployeeToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const employees = await employeeRepository.syncAllEmployeesForMeili();
  const flattenData = employees.map(meiliTransformer.employee);

  return await syncMeiliData({
    data: flattenData,
    indexName: "employees",
    displayName: "employees",
    primaryKey: "employeeId",
    isDeleteAll,
    isResync,
  });
};

//sync order
export const syncOrderToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const orders = await orderRepository.syncAllOrdersForMeili();
  const flattenData = orders.map(meiliTransformer.order);

  return await syncMeiliData({
    data: flattenData,
    indexName: "orders",
    displayName: "orders",
    primaryKey: "orderSortValue",
    isDeleteAll,
    isResync,
  });
};

//sync planning
export const syncPlanningPaperToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const papers = await planningPaperRepository.syncAllPaperToMeili({
    whereCondition: { deliveryPlanned: { [Op.ne]: "delivered" } },
  });
  const flattenData = papers.map(meiliTransformer.planningPaper);

  return await syncMeiliData({
    data: flattenData,
    indexName: "planningPapers",
    displayName: "planningPapers",
    primaryKey: "planningId",
    isDeleteAll,
    isResync,
  });
};

export const syncPlanningBoxToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const boxes = await planningBoxRepository.syncPlanningBoxToMeili({});
  const flattenData = boxes.map(meiliTransformer.planningBox);

  return await syncMeiliData({
    data: flattenData,
    indexName: "planningBoxes",
    displayName: "planningBoxes",
    primaryKey: "planningBoxId",
    isDeleteAll,
    isResync,
  });
};

//scrap report
export const syncScrapReportToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const scrapReport = await scrapReportRepository.syncAllScrapReportForMeili({});
  const flattenData = scrapReport.map(meiliTransformer.scrapReport);

  return await syncMeiliData({
    data: flattenData,
    indexName: "scrapReports",
    displayName: "scrapReports",
    primaryKey: "scrapId",
    isDeleteAll,
    isResync,
  });
};

//sync inbound & outbound
export const syncInboundToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const inbounds = await warehouseRepository.syncAllInboundsForMeili();
  const flattenData = inbounds.map(meiliTransformer.inbound);

  return await syncMeiliData({
    data: flattenData,
    indexName: "inboundHistories",
    displayName: "inboundHistories",
    primaryKey: "inboundId",
    isDeleteAll,
    isResync,
  });
};

export const syncOutboundToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const outbounds = await warehouseRepository.syncAllOutboundsForMeili();
  const flattenData = outbounds.map(meiliTransformer.outbound);

  return await syncMeiliData({
    data: flattenData,
    indexName: "outbounds",
    displayName: "outbounds",
    primaryKey: "outboundId",
    isDeleteAll,
    isResync,
  });
};

//sync inventory
export const syncInventoryToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const inventories = await inventoryRepository.syncAllInventoryForMeili({
    qtyInventory: { [Op.ne]: 0 },
  });
  const flattenData = inventories.map(meiliTransformer.inventory);

  return await syncMeiliData({
    data: flattenData,
    indexName: "inventories",
    displayName: "inventories",
    primaryKey: "inventoryId",
    isDeleteAll,
    isResync,
  });
};

//sync report
export const syncReportPaperToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const papers = await reportRepository.syncAllReportPapersForMeili();
  const flattenData = papers.map(meiliTransformer.reportPaper);

  return await syncMeiliData({
    data: flattenData,
    indexName: "reportPapers",
    displayName: "reportPapers",
    primaryKey: "reportPaperId",
    isDeleteAll,
    isResync,
  });
};

export const syncReportBoxToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const boxes = await reportRepository.syncAllReportBoxesForMeili();
  const flattenData = boxes.map(meiliTransformer.reportBox);

  return await syncMeiliData({
    data: flattenData,
    indexName: "reportBoxes",
    displayName: "reportBoxes",
    primaryKey: "reportBoxId",
    isDeleteAll,
    isResync,
  });
};

//sync inspection paper & box
export const syncInspectionPaperToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const papers = await qcRepository.syncAllInspecPaperForMeili();
  const flattenData = papers.map(meiliTransformer.inspectionPaper);

  return await syncMeiliData({
    data: flattenData,
    indexName: "inspection_papers",
    displayName: "inspection_papers",
    primaryKey: "inspecPaperId",
    isDeleteAll,
    isResync,
  });
};

export const syncInspectionBoxToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const boxes = await qcRepository.syncAllInspecBoxForMeili();
  const flattenData = boxes.map(meiliTransformer.inspectionBox);

  return await syncMeiliData({
    data: flattenData,
    indexName: "inspection_boxes",
    displayName: "inspection_boxes",
    primaryKey: "inspecBoxId",
    isDeleteAll,
    isResync,
  });
};

//sync delivery
export const syncDeliveryRequestToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const requests = await deliveryRepository.syncAllDeliveryRequestForMeili({
    whereCondition: { status: { [Op.notIn]: ["scheduled", "cancelled"] } },
  });
  const flattenData = requests.map(meiliTransformer.deliveryRequest);

  return await syncMeiliData({
    data: flattenData,
    indexName: "deliveryRequest",
    displayName: "deliveryRequest",
    primaryKey: "requestId",
    isDeleteAll,
    isResync,
  });
};

//sync dashboard
export const syncDashboardToMeili = async (options?: SyncOptions) => {
  const { isDeleteAll, isResync } = parseSyncOptions(options);
  const dashboard = await PlanningPaper.findAll({
    attributes: ["planningId", "ghepKho", "chooseMachine", "status"],
    include: [
      {
        model: Order,
        attributes: ["orderId"],
        include: [
          { model: Customer, attributes: ["customerName", "companyName"] },
          { model: User, attributes: ["fullName"] },
        ],
      },
    ],
  });

  const flattenData = dashboard.map(meiliTransformer.dashboard);

  return await syncMeiliData({
    data: flattenData,
    indexName: "dashboard",
    displayName: "dashboard",
    primaryKey: "planningId",
    isDeleteAll,
    isResync,
  });
};
