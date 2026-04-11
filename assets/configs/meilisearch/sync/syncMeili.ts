import { User } from "../../../../models/user/user";
import { AppError } from "../../../../utils/appError";
import { Order } from "../../../../models/order/order";
import { meiliTransformer } from "../meiliTransformer";
import { Product } from "../../../../models/product/product";
import { meiliClient } from "../../connect/meilisearch.connect";
import { Customer } from "../../../../models/customer/customer";
import { Inventory } from "../../../../models/warehouse/inventory";
import { PlanningBox } from "../../../../models/planning/planningBox";
import { QcSession } from "../../../../models/qualityControl/qcSession";
import { PlanningPaper } from "../../../../models/planning/planningPaper";
import { OutboundDetail } from "../../../../models/warehouse/outboundDetail";
import { productRepository } from "../../../../repository/productRepository";
import { InboundHistory } from "../../../../models/warehouse/inboundHistory";
import { OutboundHistory } from "../../../../models/warehouse/outboundHistory";
import { ReportPlanningBox } from "../../../../models/report/reportPlanningBox";
import { EmployeeBasicInfo } from "../../../../models/employee/employeeBasicInfo";
import { ReportPlanningPaper } from "../../../../models/report/reportPlanningPaper";
import { EmployeeCompanyInfo } from "../../../../models/employee/employeeCompanyInfo";
import { planningBoxRepository } from "../../../../repository/planning/planningBoxRepository";

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
  const customers = await Customer.findAll({
    attributes: ["customerId", "customerName", "companyName", "cskh", "phone", "customerSeq"],
    order: [["customerSeq", "ASC"]],
  });

  return await syncMeiliData({
    data: customers,
    indexName: "customers",
    displayName: "customers",
    primaryKey: "customerId",
    isDeleteAll: isDeleteAll,
  });
};

//sync product
export const syncProductToMeili = async (isDeleteAll: boolean) => {
  const { rows } = await productRepository.findProductByPage({});

  return await syncMeiliData({
    data: rows,
    indexName: "products",
    displayName: "products",
    primaryKey: "productId",
    isDeleteAll: isDeleteAll,
  });
};

//sync employee
export const syncEmployeeToMeili = async (isDeleteAll: boolean) => {
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
  const orders = await Order.findAll({
    attributes: ["orderId", "flute", "QC_box", "price", "status", "userId", "orderSortValue"],
    include: [
      { model: Customer, attributes: ["customerName"] },
      { model: Product, attributes: ["productName"] },
    ],
  });

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
  const papers = await PlanningPaper.findAll({
    attributes: ["planningId", "ghepKho", "orderId", "chooseMachine", "status"],
    include: [
      {
        model: Order,
        include: [
          { model: Customer, attributes: ["customerName"] },
          { model: Product, attributes: ["productName"] },
        ],
      },
    ],
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

//sync inbound & outbound
export const syncInboundToMeili = async (isDeleteAll: boolean) => {
  const inbounds = await InboundHistory.findAll({
    attributes: ["inboundId", "dateInbound"],
    include: [
      {
        model: Order,
        attributes: ["orderId"],
        include: [{ model: Customer, attributes: ["customerName"] }],
      },
      { model: QcSession, attributes: ["checkedBy"] },
    ],
  });

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
  const outbounds = await OutboundHistory.findAll({
    attributes: ["outboundId", "outboundSlipCode", "dateOutbound"],
    include: [
      {
        model: OutboundDetail,
        as: "detail",
        attributes: ["outboundDetailId"],
        include: [
          {
            model: Order,
            attributes: ["orderId"],
            include: [{ model: Customer, attributes: ["customerName"] }],
          },
        ],
      },
    ],
  });

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
  const inventories = await Inventory.findAll({
    attributes: ["inventoryId"],
    include: [
      {
        model: Order,
        attributes: ["orderId"],
        include: [{ model: Customer, attributes: ["customerName"] }],
      },
    ],
  });

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
  const papers = await ReportPlanningPaper.findAll({
    attributes: ["reportPaperId", "dayReport", "shiftManagement"],
    include: [
      {
        model: PlanningPaper,
        attributes: ["planningId", "chooseMachine"],
        include: [
          {
            model: Order,
            attributes: ["orderId"],
            include: [{ model: Customer, attributes: ["customerName"] }],
          },
        ],
      },
    ],
  });

  const flattenData = papers.map(meiliTransformer.reportPaper);

  console.log(flattenData[0]);

  return await syncMeiliData({
    data: flattenData,
    indexName: "reportPapers",
    displayName: "reportPapers",
    primaryKey: "reportPaperId",
    isDeleteAll: isDeleteAll,
  });
};

export const syncReportBoxToMeili = async (isDeleteAll: boolean) => {
  const boxes = await ReportPlanningBox.findAll({
    attributes: ["reportBoxId", "dayReport", "shiftManagement", "machine"],
    include: [
      {
        model: PlanningBox,
        attributes: ["planningBoxId"],
        include: [
          {
            model: Order,
            attributes: ["orderId", "QC_box"],
            include: [{ model: Customer, attributes: ["customerName"] }],
          },
        ],
      },
    ],
  });

  const flattenData = boxes.map(meiliTransformer.reportBox);

  // console.log(flattenData[0]);

  return await syncMeiliData({
    data: flattenData,
    indexName: "reportBoxes",
    displayName: "reportBoxes",
    primaryKey: "reportBoxId",
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
