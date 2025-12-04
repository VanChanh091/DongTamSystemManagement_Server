import { ReportPlanningPaper } from "../../../models/report/reportPlanningPaper";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { Order } from "../../../models/order/order";
import { Customer } from "../../../models/customer/customer";
import { Box } from "../../../models/order/box";
import { ReportPlanningBox } from "../../../models/report/reportPlanningBox";
import { PlanningBox } from "../../../models/planning/planningBox";
import { PlanningBoxTime } from "../../../models/planning/planningBoxMachineTime";
import { Op } from "sequelize";
import { CacheManager } from "../cacheManager";
import redisCache from "../../../configs/redisCache";
import { normalizeVN } from "../normalizeVN";

export const filterReportByField = async ({
  keyword,
  machine,
  getFieldValue,
  page,
  pageSize,
  message,
  isBox = false,
}: {
  keyword: string;
  machine: string;
  getFieldValue: (report: any) => any;
  page?: number | string;
  pageSize?: number | string;
  message: string;
  isBox?: boolean;
}) => {
  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 20;
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const { paper, box } = CacheManager.keys.report;
  const cacheKey = isBox ? box.search(machine) : paper.search(machine);

  try {
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

    // Lọc dữ liệu
    const filteredReports = allReports.filter((report: any) => {
      const fieldValue = getFieldValue(report);
      return fieldValue != null
        ? normalizeVN(String(fieldValue).toLowerCase()).includes(normalizeVN(lowerKeyword))
        : false;
    });

    // Phân trang
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

const findAllReportBox = async ({ isBox, machine }: { isBox: boolean; machine: string }) => {
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
  machine = "",
  otherData,
  transaction,
  isBox = false,
}: {
  planning: any;
  model: any;
  qtyProduced: number;
  qtyWasteNorm: number;
  dayReportValue: Date | string;
  shiftManagementBox?: string;
  machine?: string;
  otherData?: {
    shiftProduction: string;
    shiftManagement: string;
  };
  transaction: any;
  isBox?: boolean;
}) => {
  //condition to get id
  const whereCondition = isBox
    ? {
        planningBoxId: planning.PlanningBox.planningBoxId,
        machine: machine,
      }
    : {
        planningId: planning.planningId,
      };

  //total qtyProduced
  const producedSoFar =
    (await model.sum("qtyProduced", {
      where: whereCondition,
      transaction,
    })) || 0;

  // Cộng thêm sản lượng lần này
  const totalProduced = producedSoFar + Number(qtyProduced || 0);

  // Tính số lượng còn thiếu
  let lackOfQtyValue = planning.runningPlan - totalProduced;

  let report;
  if (isBox) {
    //box
    report = await model.create(
      {
        planningBoxId: planning.PlanningBox.planningBoxId,
        dayReport: dayReportValue,
        qtyProduced: qtyProduced,
        lackOfQty: lackOfQtyValue,
        wasteLoss: qtyWasteNorm,
        shiftManagement: shiftManagementBox,
        machine: machine,
      },
      { transaction }
    );
  } else {
    // paper
    report = await model.create(
      {
        planningId: planning.planningId,
        dayReport: dayReportValue,
        qtyProduced: qtyProduced,
        lackOfQty: lackOfQtyValue,
        qtyWasteNorm: qtyWasteNorm,
        shiftProduction: otherData!.shiftProduction,
        shiftManagement: otherData!.shiftManagement,
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
