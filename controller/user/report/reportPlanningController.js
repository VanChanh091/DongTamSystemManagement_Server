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

const redisCache = new Redis();

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
    console.error("get all customer failed:", error);
    res.status(500).json({ message: "get all customers failed", error });
  }
};

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
    console.error("get all customer failed:", error);
    res.status(500).json({ message: "get all customers failed", error });
  }
};
