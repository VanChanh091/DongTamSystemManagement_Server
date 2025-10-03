import Redis from "ioredis";
import { Op } from "sequelize";
import ExcelJS from "exceljs";
import Order from "../../../models/order/order.js";
import Box from "../../../models/order/box.js";
import Customer from "../../../models/customer/customer.js";
import PlanningPaper from "../../../models/planning/planningPaper.js";
import ReportPlanningPaper from "../../../models/report/reportPlanningPaper.js";
import PlanningBoxTime from "../../../models/planning/planningBoxMachineTime.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import ReportPlanningBox from "../../../models/report/reportPlanningBox.js";
import { filterReportByField } from "../../../utils/helper/reportHelper.js";
import { mapReportPaperRow, reportPaperColumns } from "./mapping/reportPaperRowAndColumn.js";
import { mapReportBoxRow, reportBoxColumns } from "./mapping/reportBoxRowAndColumn.js";

const redisCache = new Redis();

//===============================REPORT PAPER=====================================

//get all report planning paper
export const getReportPlanningPaper = async (req, res) => {
  const { machine, refresh = false, page = 1, pageSize = 20 } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  if (!machine) {
    return res.status(400).json({ message: "Missing 'machine' query parameter" });
  }

  const cacheKey = `reportPaper:all:page:${currentPage}`;
  try {
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Report Planning Paper from Redis");
      const parsed = JSON.parse(cachedData);
      return res
        .status(200)
        .json({ ...parsed, message: "Get all report planning paper from cache" });
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

//get by customerName
export const getReportPaperByCustomerName = async (req, res) => {
  const { customerName, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: customerName,
      machine,
      getFieldValue: (report) => report?.Planning?.Order?.Customer?.customerName,
      page,
      pageSize,
      message: "get all customerName from cache",
      refresh: refresh,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get customerName:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by dayReported
export const getReportPaperByDayReported = async (req, res) => {
  const { dayReported, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: dayReported,
      machine,
      getFieldValue: (report) => report?.dayReport,
      page,
      pageSize,
      message: "get all dayReported from cache",
      refresh: refresh,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get dayReported:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by qtyReported
export const getReportPaperByQtyReported = async (req, res) => {
  const { qtyProduced, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: qtyProduced,
      machine,
      getFieldValue: (report) => report?.qtyProduced,
      page,
      pageSize,
      message: "get all qtyReported from cache",
      refresh: refresh,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get qtyReported:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by ghepKho
export const getReportPaperByGhepKho = async (req, res) => {
  const { ghepKho, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: ghepKho,
      machine,
      getFieldValue: (report) => report?.Planning?.ghepKho,
      page,
      pageSize,
      message: "get all ghepKho from cache",
      refresh: refresh,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get ghepKho:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by shiftManagement
export const getReportPaperByShiftManagement = async (req, res) => {
  const { shiftManagement, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: shiftManagement,
      machine,
      getFieldValue: (report) => report?.shiftManagement,
      page,
      pageSize,
      message: "get all shiftManagement from cache",
      refresh: refresh,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get shiftManagement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by orderId
export const getReportPaperByOrderId = async (req, res) => {
  const { orderId, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: orderId,
      machine,
      getFieldValue: (report) => report?.Planning?.Order?.orderId,
      page,
      pageSize,
      message: "get all orderId from cache",
      refresh: refresh,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get orderId:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//===============================REPORT BOX=====================================

//get all report planning box
export const getReportPlanningBox = async (req, res) => {
  const { machine, refresh = false, page = 1, pageSize = 20 } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  if (!machine) {
    return res.status(400).json({ message: "Missing 'machine' query parameter" });
  }

  const cacheKey = `reportBox:all:page:${currentPage}`;
  try {
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Report Planning Box from Redis");
      const parsed = JSON.parse(cachedData);
      return res.status(200).json({ ...parsed, message: "Get all report planning box from cache" });
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

//get by customerName
export const getReportBoxByCustomerName = async (req, res) => {
  const { customerName, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: customerName,
      machine,
      getFieldValue: (report) => report?.PlanningBox?.Order?.Customer?.customerName,
      page,
      pageSize,
      message: "get all customerName from cache",
      refresh: refresh,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get customerName:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by dayReported
export const getReportBoxByDayReported = async (req, res) => {
  const { dayReported, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: dayReported,
      machine,
      getFieldValue: (report) => report?.dayReport,
      page,
      pageSize,
      message: "get all dayReported from cache",
      refresh: refresh,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get dayReported:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// //get by qtyReported
export const getReportBoxByQtyReported = async (req, res) => {
  const { qtyProduced, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: qtyProduced,
      machine,
      getFieldValue: (report) => report?.qtyProduced,
      page,
      pageSize,
      message: "get all qtyProduced from cache",
      refresh: refresh,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get qtyProduced:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by QC_Box
export const getReportBoxByQcBox = async (req, res) => {
  const { QcBox, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: QcBox,
      machine,
      getFieldValue: (report) => report?.PlanningBox?.Order?.QC_box,
      page,
      pageSize,
      message: "get all QcBox from cache",
      refresh: refresh,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get QcBox:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by shiftManagement
export const getReportBoxByShiftManagement = async (req, res) => {
  const { shiftManagement, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: shiftManagement,
      machine,
      getFieldValue: (report) => report?.shiftManagement,
      page,
      pageSize,
      message: "get all shiftManagement from cache",
      refresh: refresh,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get shiftManagement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get by orderId
export const getReportBoxByOrderId = async (req, res) => {
  const { orderId, machine, page = 1, pageSize = 20, refresh = false } = req.query;

  try {
    const result = await filterReportByField({
      keyword: orderId,
      machine,
      getFieldValue: (report) => report?.PlanningBox?.Order?.orderId,
      page,
      pageSize,
      message: "get all orderId from cache",
      refresh: refresh,
      isBox: true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get orderId:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Báo cáo sản xuất giấy tấm");

    // Tạo header
    worksheet.columns = reportPaperColumns;

    // Đổ dữ liệu
    data.forEach((item, index) => {
      worksheet.addRow(mapReportPaperRow(item, index));
    });

    // Style header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Xuất file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report-paper-${machine}-${dateStr}.xlsx`
    );

    await workbook.xlsx.write(res);

    res.end();
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

    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Báo cáo sản xuất thùng");

    // Tạo header
    worksheet.columns = reportBoxColumns;

    // Đổ dữ liệu
    data.forEach((item, index) => {
      worksheet.addRow(mapReportBoxRow(item, index));
    });

    // Style header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    console.log(machine);

    // Xuất file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
};
