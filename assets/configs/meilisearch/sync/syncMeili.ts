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
import { planningBoxRepository } from "../../../../repository/planning/planningBoxRepository";
import { planningPaperRepository } from "../../../../repository/planning/planningPaperRepository";
import { scrapReportRepository } from "../../../../repository/scrapReportRepository";

interface SyncMeiliData {
  data: any[];
  indexName: string;
  primaryKey: string;
  displayName: string;
  isDeleteAll?: boolean;
}

const syncMeiliData = async ({
  indexName,
  primaryKey,
  data,
  displayName,
  isDeleteAll,
}: SyncMeiliData) => {
  try {
    if (!isDeleteAll) {
      if (!data || data.length === 0) {
        throw AppError.NotFound(
          `No ${displayName} found to sync`,
          `SYNC_${indexName.toUpperCase()}_NOT_FOUND`,
        );
      }
    }

    const index = meiliClient.index(indexName);

    let task;
    if (isDeleteAll) {
      task = await index.deleteAllDocuments();
    } else {
      task = await index.addDocuments(data, { primaryKey });
    }

    // Khai customerId là primary key
    console.log(`🚀 Đang đồng bộ ${data.length} ${displayName}... TaskID: ${task.taskUid}`);

    return task.taskUid;
  } catch (error) {
    console.error("❌ Lỗi đồng bộ Meilisearch:", error);
    if (error instanceof AppError) throw error;
    throw AppError.ServerError();
  }
};

//delete or add all data in meilisearch
// export const syncOrDeleteAllDataToMeili = async (isDeleteAll: boolean) => {
//   try {
//   } catch (error) {}
// };

export const resetMeiliIndex = async (indexName: string) => {
  try {
    await meiliClient.deleteIndex(indexName);
    console.log(`🗑️ Đã xóa Index: ${indexName}`);
  } catch (error) {
    console.log(`Index ${indexName} chưa tồn tại, không cần xóa.`);
  }
};

//sync customer
export const syncCustomerToMeili = async (isDeleteAll: boolean) => {
  const customers = await customerRepository.syncAllCustomersForMeili();
  const flattenData = customers.map(meiliTransformer.customer);

  return await syncMeiliData({
    data: flattenData,
    indexName: "customers",
    displayName: "customers",
    primaryKey: "customerId",
    isDeleteAll: isDeleteAll,
  });
};

//sync product
export const syncProductToMeili = async (isDeleteAll: boolean) => {
  const query = productRepository.buildProductOptions({});
  const products = await Product.findAll(query);

  return await syncMeiliData({
    data: products,
    indexName: "products",
    displayName: "products",
    primaryKey: "productId",
    isDeleteAll: isDeleteAll,
  });
};

//sync employee
export const syncEmployeeToMeili = async (isDeleteAll: boolean) => {
  const employees = await employeeRepository.syncAllEmployeesForMeili();
  const flattenData = employees.map(meiliTransformer.employee);

  return await syncMeiliData({
    data: flattenData,
    indexName: "employees",
    displayName: "employees",
    primaryKey: "employeeId",
    isDeleteAll: isDeleteAll,
  });
};

//sync order
export const syncOrderToMeili = async (isDeleteAll: boolean) => {
  const orders = await orderRepository.syncAllOrdersForMeili();
  const flattenData = orders.map(meiliTransformer.order);

  return await syncMeiliData({
    data: flattenData,
    indexName: "orders",
    displayName: "orders",
    primaryKey: "orderSortValue",
    isDeleteAll: isDeleteAll,
  });
};

//sync planning
export const syncPlanningPaperToMeili = async (isDeleteAll: boolean) => {
  const papers = await planningPaperRepository.syncAllPaperToMeili({
    whereCondition: { deliveryPlanned: { [Op.ne]: "delivered" } },
  });
  const flattenData = papers.map(meiliTransformer.planningPaper);

  return await syncMeiliData({
    data: flattenData,
    indexName: "planningPapers",
    displayName: "planningPapers",
    primaryKey: "planningId",
    isDeleteAll: isDeleteAll,
  });
};

export const syncPlanningBoxToMeili = async (isDeleteAll: boolean) => {
  const boxes = await planningBoxRepository.syncPlanningBoxToMeili({});
  const flattenData = boxes.map(meiliTransformer.planningBox);

  return await syncMeiliData({
    data: flattenData,
    indexName: "planningBoxes",
    displayName: "planningBoxes",
    primaryKey: "planningBoxId",
    isDeleteAll: isDeleteAll,
  });
};

//scrap report
export const syncScrapReportToMeili = async (isDeleteAll: boolean) => {
  const scrapReport = await scrapReportRepository.syncAllScrapReportForMeili({});
  const flattenData = scrapReport.map(meiliTransformer.scrapReport);

  return await syncMeiliData({
    data: flattenData,
    indexName: "scrapReports",
    displayName: "scrapReports",
    primaryKey: "scrapId",
    isDeleteAll: isDeleteAll,
  });
};

//sync inbound & outbound
export const syncInboundToMeili = async (isDeleteAll: boolean) => {
  const inbounds = await warehouseRepository.syncAllInboundsForMeili();
  const flattenData = inbounds.map(meiliTransformer.inbound);

  return await syncMeiliData({
    data: flattenData,
    indexName: "inboundHistories",
    displayName: "inboundHistories",
    primaryKey: "inboundId",
    isDeleteAll: isDeleteAll,
  });
};

export const syncOutboundToMeili = async (isDeleteAll: boolean) => {
  const outbounds = await warehouseRepository.syncAllOutboundsForMeili();
  const flattenData = outbounds.map(meiliTransformer.outbound);

  return await syncMeiliData({
    data: flattenData,
    indexName: "outbounds",
    displayName: "outbounds",
    primaryKey: "outboundId",
    isDeleteAll: isDeleteAll,
  });
};

//sync inventory
export const syncInventoryToMeili = async (isDeleteAll: boolean) => {
  const inventories = await inventoryRepository.syncAllInventoryForMeili();
  const flattenData = inventories.map(meiliTransformer.inventory);

  return await syncMeiliData({
    data: flattenData,
    indexName: "inventories",
    displayName: "inventories",
    primaryKey: "inventoryId",
    isDeleteAll: isDeleteAll,
  });
};

//sync report
export const syncReportPaperToMeili = async (isDeleteAll: boolean) => {
  const papers = await reportRepository.syncAllReportPapersForMeili();
  const flattenData = papers.map(meiliTransformer.reportPaper);

  return await syncMeiliData({
    data: flattenData,
    indexName: "reportPapers",
    displayName: "reportPapers",
    primaryKey: "reportPaperId",
    isDeleteAll: isDeleteAll,
  });
};

export const syncReportBoxToMeili = async (isDeleteAll: boolean) => {
  const boxes = await reportRepository.syncAllReportBoxesForMeili();
  const flattenData = boxes.map(meiliTransformer.reportBox);

  return await syncMeiliData({
    data: flattenData,
    indexName: "reportBoxes",
    displayName: "reportBoxes",
    primaryKey: "reportBoxId",
    isDeleteAll: isDeleteAll,
  });
};

export const syncDeliveryRequestToMeili = async (isDeleteAll: boolean) => {
  const requests = await deliveryRepository.syncAllDeliveryRequestForMeili({
    whereCondition: { status: { [Op.notIn]: ["scheduled", "cancelled"] } },
  });
  const flattenData = requests.map(meiliTransformer.deliveryRequest);

  return await syncMeiliData({
    data: flattenData,
    indexName: "deliveryRequest",
    displayName: "deliveryRequest",
    primaryKey: "requestId",
    isDeleteAll: isDeleteAll,
  });
};

//sync dashboard
export const syncDashboardToMeili = async (isDeleteAll: boolean) => {
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
    isDeleteAll: isDeleteAll,
  });
};
