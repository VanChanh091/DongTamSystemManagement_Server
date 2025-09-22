import Redis from "ioredis";
import ReportPlanningPaper from "../../models/report/reportPlanningPaper.js";
import PlanningPaper from "../../models/planning/planningPaper.js";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Box from "../../models/order/box.js";
import ReportPlanningBox from "../../models/report/reportPlanningBox.js";
import PlanningBox from "../../models/planning/planningBox.js";
import PlanningBoxTime from "../../models/planning/planningBoxMachineTime.js";
import { Op } from "sequelize";

const redisCache = new Redis();

export const filterReportByField = async ({
  keyword,
  machine,
  getFieldValue,
  page,
  pageSize,
  message,
  isBox = false,
  refresh = false,
}) => {
  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 20;
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const cacheKey = isBox ? "reportBox:search:all" : "reportPaper:search:all";

  try {
    if (refresh == "true") {
      await redisCache.del(cacheKey);
    }
    let allReports = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allReports) {
      allReports = await findAllReportBox({ isBox, machine });
      await redisCache.set(cacheKey, JSON.stringify(allReports), "EX", 900);
      sourceMessage = "Get reports from DB";
    } else {
      allReports = JSON.parse(allReports);
      sourceMessage = message;
    }

    //check both string and number
    const filteredReports = allReports.filter((report) => {
      const fieldValue = getFieldValue(report);
      if (fieldValue == null) return false;
      return String(fieldValue).toLowerCase().includes(lowerKeyword);
    });

    const totalReports = filteredReports.length;
    const totalPages = Math.ceil(totalReports / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;
    const paginatedReports = filteredReports.slice(offset, offset + currentPageSize);

    return {
      message: sourceMessage,
      data: paginatedReports,
      totalReports,
      totalPages,
      currentPage,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Lỗi server");
  }
};

const findAllReportBox = async ({ isBox, machine }) => {
  try {
    let data;

    if (isBox) {
      data = await ReportPlanningBox.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: PlanningBox,
            attributes: {
              exclude: [
                "hasIn",
                "hasBe",
                "hasXa",
                "hasDan",
                "hasCanLan",
                "hasCatKhe",
                "hasCanMang",
                "hasDongGhim",
                "createdAt",
                "updatedAt",
              ],
            },
            include: [
              {
                model: PlanningBoxTime,
                where: { machine: machine },
                as: "boxTimes",
                attributes: { exclude: ["createdAt", "updatedAt"] },
              },
              {
                model: PlanningBoxTime,
                as: "allBoxTimes",
                where: {
                  machine: { [Op.ne]: machine },
                },
                attributes: {
                  exclude: [
                    "timeRunning",
                    "dayStart",
                    "dayCompleted",
                    "wasteBox",
                    "shiftManagement",
                    "status",
                    "sortPlanning",
                    "createdAt",
                    "updatedAt",
                    "rpWasteLoss",
                  ],
                },
              },
              {
                model: Order,
                attributes: {
                  exclude: [
                    "acreage",
                    "dvt",
                    "price",
                    "pricePaper",
                    "discount",
                    "profit",
                    "vat",
                    "rejectReason",
                    "createdAt",
                    "updatedAt",
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "day",
                    "matE",
                    "matB",
                    "matC",
                    "songE",
                    "songB",
                    "songC",
                    "songE2",
                    "lengthPaperManufacture",
                    "status",
                  ],
                },
                include: [
                  { model: Customer, attributes: ["customerName", "companyName"] },
                  {
                    model: Box,
                    as: "box",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                  },
                ],
              },
            ],
          },
        ],
      });
    } else {
      data = await ReportPlanningPaper.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: PlanningPaper,
            where: { chooseMachine: machine },
            attributes: {
              exclude: [
                "createdAt",
                "updatedAt",
                "dayCompleted",
                "shiftProduction",
                "shiftProduction",
                "shiftManagement",
                "status",
                "hasOverFlow",
                "sortPlanning",
              ],
            },
            include: [
              {
                model: Order,
                attributes: {
                  exclude: [
                    "acreage",
                    "dvt",
                    "price",
                    "pricePaper",
                    "discount",
                    "profit",
                    "vat",
                    "rejectReason",
                    "createdAt",
                    "updatedAt",
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "quantityCustomer",
                    "day",
                    "matE",
                    "matB",
                    "matC",
                    "songE",
                    "songB",
                    "songC",
                    "songE2",
                    "lengthPaperManufacture",
                    "status",
                  ],
                },
                include: [
                  { model: Customer, attributes: ["customerName", "companyName"] },
                  {
                    model: Box,
                    as: "box",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Không lấy được data");
  }
};

export const createReportPlanning = async ({
  planning,
  model,
  qtyProduced,
  qtyWasteNorm,
  dayReportValue,
  shiftManagementBox = "",
  otherData,
  transaction,
  isBox = false,
}) => {
  const whereCondition = isBox
    ? {
        planningBoxId: planning.PlanningBox.planningBoxId,
      }
    : {
        planningId: planning.planningId,
      };

  const producedSoFar =
    (await model.sum("qtyProduced", {
      where: whereCondition,
      transaction,
    })) || 0;

  // Cộng thêm sản lượng lần này
  const totalProduced = producedSoFar + Number(qtyProduced || 0);

  // Tính số lượng còn thiếu
  let lackOfQtyValue = isBox
    ? planning.PlanningBox.runningPlan - totalProduced
    : planning.runningPlan - totalProduced;

  let report;
  if (isBox) {
    report = await model.create(
      {
        planningBoxId: planning.PlanningBox.planningBoxId,
        dayReport: dayReportValue,
        qtyProduced: qtyProduced,
        lackOfQty: lackOfQtyValue,
        wasteLoss: qtyWasteNorm,
        shiftManagement: shiftManagementBox,
      },
      { transaction }
    );
  } else {
    report = await model.create(
      {
        planningId: planning.planningId,
        dayReport: dayReportValue,
        qtyProduced: qtyProduced,
        lackOfQty: lackOfQtyValue,
        qtyWasteNorm: qtyWasteNorm,
        shiftProduction: otherData.shiftProduction,
        shiftManagement: otherData.shiftManagement,
      },
      { transaction }
    );
  }

  return {
    report,
    producedSoFar,
    totalProduced,
    lackOfQtyValue,
  };
};
