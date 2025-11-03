import Redis from "ioredis";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Box from "../../../models/order/box.js";
import Customer from "../../../models/customer/customer.js";
import PlanningPaper from "../../../models/planning/planningPaper.js";
import ReportPlanningPaper from "../../../models/report/reportPlanningPaper.js";
import PlanningBoxTime from "../../../models/planning/planningBoxMachineTime.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import ReportPlanningBox from "../../../models/report/reportPlanningBox.js";
import { filterReportByField } from "../../../utils/helper/modelHelper/reportHelper.js";
import { mapReportPaperRow, reportPaperColumns } from "./mapping/reportPaperRowAndColumn.js";
import { mapReportBoxRow, reportBoxColumns } from "./mapping/reportBoxRowAndColumn.js";
import { exportExcelResponse } from "../../../utils/helper/excelExporter.js";
import { CacheManager } from "../../../utils/helper/cacheManager.js";

const redisCache = new Redis();

//===============================REPORT PAPER=====================================

//get all report planning paper
export const getReportPlanningPaper = async (req, res) => {
  const { machine, page = 1, pageSize = 20 } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  if (!machine) {
    return res.status(400).json({ message: "Missing 'machine' query parameter" });
  }

  const { paper } = CacheManager.keys.report;
  const cacheKey = paper.all(currentPage);

  try {
    const { isChanged } = await CacheManager.check(ReportPlanningPaper, "reportPaper");

    if (isChanged) {
      await CacheManager.clearReportPaper();
    } else {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        console.log("✅ Data Report Planning Paper from Redis");
        const parsed = JSON.parse(cachedData);
        return res
          .status(200)
          .json({ ...parsed, message: "Get all report planning paper from cache" });
      }
    }

    const totalOrders = await ReportPlanningPaper.count();
    const totalPages = Math.ceil(totalOrders / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;

    const data = await ReportPlanningPaper.findAll({
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
      offset,
      limit: currentPageSize,
      order: [["dayReport", "DESC"]],
    });

    const responseData = {
      message: "get all report planning paper successfully",
      data,
      totalOrders,
      totalPages,
      currentPage,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("get all reportPaper failed:", error);
    res.status(500).json({ message: "get all reportPaper failed", error });
  }
};

//get reported paper by field
export const getReportedPaperByField = async (req, res) => {
  const { field, keyword, machine, page = 1, pageSize = 20 } = req.query;

  const fieldMap = {
    customerName: (report) => report?.Planning?.Order?.Customer?.customerName,
    dayReported: (report) => report?.dayReport,
    qtyProduced: (report) => report?.qtyProduced,
    ghepKho: (report) => report?.Planning?.ghepKho,
    shiftManagement: (report) => report?.shiftManagement,
    orderId: (report) => report?.Planning?.Order?.orderId,
  };

  if (!fieldMap[field]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  try {
    const result = await filterReportByField({
      keyword: keyword,
      machine,
      getFieldValue: fieldMap[field],
      page,
      pageSize,
      message: `get all by ${field} from filtered cache`,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get report paper by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//===============================REPORT BOX=====================================

//get all report planning box
export const getReportPlanningBox = async (req, res) => {
  const { machine, page = 1, pageSize = 20 } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  if (!machine) {
    return res.status(400).json({ message: "Missing 'machine' query parameter" });
  }

  const { box } = CacheManager.keys.report;
  const cacheKey = box.all(currentPage);

  try {
    const { isChanged } = await CacheManager.check(ReportPlanningBox, "reportBox");

    if (isChanged) {
      await CacheManager.clearReportBox();
    } else {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        console.log("✅ Data Report Planning Box from Redis");
        const parsed = JSON.parse(cachedData);
        return res
          .status(200)
          .json({ ...parsed, message: "Get all report planning box from cache" });
      }
    }

    const totalOrders = await ReportPlanningBox.count();
    const totalPages = Math.ceil(totalOrders / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;

    const data = await ReportPlanningBox.findAll({
      where: { machine: machine },
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
              where: { machine: machine }, //tìm machine thỏa điều kiện
              as: "boxTimes",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: PlanningBoxTime,
              as: "allBoxTimes",
              where: {
                machine: { [Op.ne]: machine }, //lọc machine ra khỏi danh sách
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
      offset,
      limit: currentPageSize,
      order: [["dayReport", "DESC"]],
    });

    const responseData = {
      message: "get all report planning paper successfully",
      data,
      totalOrders,
      totalPages,
      currentPage,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("get all reportBox failed:", error);
    res.status(500).json({ message: "get all reportBox failed", error });
  }
};

//get reported box by field
export const getReportedBoxByField = async (req, res) => {
  const { field, keyword, machine, page = 1, pageSize = 20 } = req.query;

  const fieldMap = {
    customerName: (report) => report?.PlanningBox?.Order?.Customer?.customerName,
    dayReported: (report) => report?.dayReport,
    qtyProduced: (report) => report?.qtyProduced,
    QcBox: (report) => report?.PlanningBox?.Order?.QC_box,
    shiftManagement: (report) => report?.shiftManagement,
    orderId: (report) => report?.PlanningBox?.Order?.orderId,
  };

  if (!fieldMap[field]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  try {
    const result = await filterReportByField({
      keyword: keyword,
      machine,
      getFieldValue: fieldMap[field],
      page,
      pageSize,
      message: `get all by ${field} from filtered cache`,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get report paper by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//===============================EXPORT EXCEL=====================================

//export excel paper
export const exportExcelReportPaper = async (req, res) => {
  const { fromDate, toDate, reportPaperId, machine } = req.body;

  try {
    let whereCondition = {};

    if (reportPaperId && reportPaperId.length > 0) {
      whereCondition.reportPaperId = reportPaperId;
    } else if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      whereCondition.dayReport = { [Op.between]: [start, end] };
    }

    const data = await ReportPlanningPaper.findAll({
      where: whereCondition,
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
      order: [["dayReport", "ASC"]],
    });

    await exportExcelResponse(res, {
      data: data,
      sheetName: "Báo cáo sản xuất giấy tấm",
      fileName: `report_paper_${machine}`,
      columns: reportPaperColumns,
      rows: mapReportPaperRow,
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
};

//export excel box
export const exportExcelReportBox = async (req, res) => {
  const { fromDate, toDate, reportBoxId, machine } = req.body;

  try {
    let whereCondition = {};

    if (reportBoxId && reportBoxId.length > 0) {
      whereCondition.reportBoxId = reportBoxId;
    } else if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      whereCondition.dayReport = { [Op.between]: [start, end] };
    }

    const data = await ReportPlanningBox.findAll({
      where: whereCondition,
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

    await exportExcelResponse(res, {
      data: data,
      sheetName: "Báo cáo sản xuất thùng",
      fileName: `report_box_${machine}`,
      columns: reportBoxColumns,
      rows: mapReportBoxRow,
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
};
