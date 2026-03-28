import { AppError } from "../../../../utils/appError";
import { meiliClient } from "../../connect/melisearch.config";
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
import { meiliTransformer } from "../meiliTransformer";
import { EmployeeBasicInfo } from "../../../../models/employee/employeeBasicInfo";
import { EmployeeCompanyInfo } from "../../../../models/employee/employeeCompanyInfo";

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
    if (!data || data.length === 0) {
      throw AppError.NotFound(
        `No ${displayName} found to sync`,
        `SYNC_${indexName.toUpperCase()}_NOT_FOUND`,
      );
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

//sync customer
export const syncCustomerToMeili = async () => {
  const customers = await Customer.findAll({
    attributes: ["customerId", "customerName", "companyName", "cskh", "phone", "customerSeq"],
    order: [["customerSeq", "ASC"]],
  });

  return syncMeiliData({
    data: customers,
    indexName: "customers",
    displayName: "customers",
    primaryKey: "customerId",
    // isDeleteAll: true,
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
  const employees = await EmployeeBasicInfo.findAll({
    attributes: ["employeeId", "fullName", "phoneNumber"],
    include: [
      {
        model: EmployeeCompanyInfo,
        as: "companyInfo",
        attributes: ["employeeCode", "status"],
      },
    ],
    order: [["employeeId", "ASC"]],
  });

  const flattenData = employees.map(meiliTransformer.employee);

  return syncMeiliData({
    data: flattenData,
    indexName: "employees",
    displayName: "employees",
    primaryKey: "employeeId",
    // isDeleteAll: true,
  });
};

//sync order
export const syncOrderToMeili = async () => {
  const orders = await Order.findAll({
    attributes: ["orderId", "flute", "QC_box", "price", "status", "userId", "orderSortValue"],
    include: [
      { model: Customer, attributes: ["customerName"] },
      { model: Product, attributes: ["productName"] },
    ],
  });

  const flattenData = orders.map(meiliTransformer.order);

  return syncMeiliData({
    data: flattenData,
    indexName: "orders",
    displayName: "orders",
    primaryKey: "orderSortValue",
    // isDeleteAll: true,
  });
};

//sync planning waiting
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

// waiting
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

//sync inbound & outbound waiting
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

// waiting
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

//sync inventory waiting
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

//sync report waiting
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

// waiting
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

//sync dashboard waiting
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
