import { AppError } from "../../../../utils/appError";
import { meiliClient } from "../../connect/melisearch.config";
import { customerRepository } from "../../../../repository/customerRepository";
import { employeeRepository } from "../../../../repository/employeeRepository";
import { productRepository } from "../../../../repository/productRepository";
import { Order } from "../../../../models/order/order";
import { Product } from "../../../../models/product/product";
import { Customer } from "../../../../models/customer/customer";
import { PlanningPaper } from "../../../../models/planning/planningPaper";
import { PlanningBox } from "../../../../models/planning/planningBox";
import { InboundHistory } from "../../../../models/warehouse/inboundHistory";
import { OutboundHistory } from "../../../../models/warehouse/outboundHistory";
import { OutboundDetail } from "../../../../models/warehouse/outboundDetail";
import { Inventory } from "../../../../models/warehouse/inventory";
import { ReportPlanningPaper } from "../../../../models/report/reportPlanningPaper";
import { ReportPlanningBox } from "../../../../models/report/reportPlanningBox";

interface SyncMeiliData {
  data: any[];
  indexName: string;
  primaryKey: string;
  displayName: string;
}

const syncMeiliData = async ({ indexName, primaryKey, data, displayName }: SyncMeiliData) => {
  try {
    if (!data || data.length === 0) {
      throw AppError.NotFound(
        `No ${displayName} found to sync`,
        `SYNC_${indexName.toUpperCase()}_NOT_FOUND`,
      );
    }

    const index = meiliClient.index(indexName);
    // const task = await index.deleteAllDocuments();

    // Khai customerId là primary key
    const task = await index.addDocuments(data, { primaryKey });

    console.log(`🚀 Đang đồng bộ ${data.length} ${displayName}... TaskID: ${task.taskUid}`);

    return task;
  } catch (error) {
    console.error("❌ Lỗi đồng bộ Meilisearch:", error);
    if (error instanceof AppError) throw error;
    throw AppError.ServerError();
  }
};

//sync customer
export const syncCustomerToMeili = async () => {
  const { rows } = await customerRepository.findCustomerByPage({});

  return syncMeiliData({
    data: rows,
    indexName: "customers",
    displayName: "customers",
    primaryKey: "customerId",
  });
};

//sync product
export const syncProductToMeili = async () => {
  const { rows } = await productRepository.findProductByPage({});

  return syncMeiliData({
    data: rows,
    indexName: "products",
    displayName: "products",
    primaryKey: "productId",
  });
};

//sync employee
export const syncEmployeeToMeili = async () => {
  const { rows } = await employeeRepository.findEmployeeByPage({});

  return syncMeiliData({
    data: rows,
    indexName: "employees",
    displayName: "employees",
    primaryKey: "employeeId",
  });
};

//sync order
export const syncOrderToMeili = async () => {
  const orders = await Order.findAll({
    where: {},
    attributes: ["orderId"],
    include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: orders,
    indexName: "orders",
    displayName: "orders",
    primaryKey: "orderId",
  });
};

//sync planning
export const syncPlanningPaperToMeili = async () => {
  const papers = await PlanningPaper.findAll({
    where: {},
    attributes: ["planningId"],
    // include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: papers,
    indexName: "planningPapers",
    displayName: "planningPapers",
    primaryKey: "planningId",
  });
};

export const syncPlanningBoxToMeili = async () => {
  const boxes = await PlanningBox.findAll({
    where: {},
    attributes: ["planningBoxId"],
    // include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: boxes,
    indexName: "planningBoxes",
    displayName: "planningBoxes",
    primaryKey: "planningBoxId",
  });
};

//sync inbound & outbound
export const syncInboundToMeili = async () => {
  const inbounds = await InboundHistory.findAll({
    where: {},
    attributes: ["inboundId"],
    include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: inbounds,
    indexName: "inboundHistories",
    displayName: "inboundHistories",
    primaryKey: "inboundId",
  });
};

export const syncOutboundToMeili = async () => {
  const outbounds = await OutboundHistory.findAll({
    where: {},
    attributes: ["outboundId"],
    include: [{ model: OutboundDetail }, { model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: outbounds,
    indexName: "outbounds",
    displayName: "outbounds",
    primaryKey: "outboundId",
  });
};

//sync inventory
export const syncInventoryToMeili = async () => {
  const inventories = await Inventory.findAll({
    where: {},
    attributes: ["inventoryId"],
    include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: inventories,
    indexName: "inventories",
    displayName: "inventories",
    primaryKey: "inventoryId",
  });
};

//sync report
export const syncReportPaperToMeili = async () => {
  const papers = await ReportPlanningPaper.findAll({
    where: {},
    attributes: ["reportPaperId"],
    include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: papers,
    indexName: "reportPapers",
    displayName: "reportPapers",
    primaryKey: "reportPaperId",
  });
};

export const syncReportBoxToMeili = async () => {
  const boxes = await ReportPlanningBox.findAll({
    where: {},
    attributes: ["reportBoxId"],
    include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: boxes,
    indexName: "reportBoxes",
    displayName: "reportBoxes",
    primaryKey: "reportBoxId",
  });
};

//sync dashboard
export const syncDashboardToMeili = async () => {
  const dashboard = await PlanningPaper.findAll({
    where: {},
    attributes: ["planningId"],
    include: [{ model: Customer }, { model: Product }],
  });

  return syncMeiliData({
    data: dashboard,
    indexName: "dashboard",
    displayName: "dashboard",
    primaryKey: "planningId",
  });
};
