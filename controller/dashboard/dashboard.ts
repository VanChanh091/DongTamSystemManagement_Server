import { PlanningPaper } from "../../models/planning/planningPaper";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { Box } from "../../models/order/box";
import { Product } from "../../models/product/product";
import { User } from "../../models/user/user";
import { Op } from "sequelize";
import redisCache from "../../configs/redisCache";
import dotenv from "dotenv";
import { Request, Response } from "express";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";

//=============================PAPER===================================

export const getAllDataPaper = async (req: Request, res: Response) => {
  const { page, pageSize, refresh = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  const cacheKey = `data:paper:all:${currentPage}`;

  try {
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const planningArray = parsed?.data ?? [];

      if (planningArray.length > 0) {
        if (devEnvironment) console.log("✅ Get Planning from cache");
        return res.status(200).json({
          message: "Get PlanningPaper from cache",
          data: planningArray,
          totalPlannings: parsed.totalPlannings,
          totalPages: parsed.totalPages,
          currentPage: parsed.currentPage,
        });
      }
    }

    const whereCondition = {
      status: "complete",
      dayCompleted: { [Op.ne]: null },
    };

    const totalPlannings = await PlanningPaper.count({ where: whereCondition });
    const totalPages = Math.ceil(totalPlannings / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;

    const data = await PlanningPaper.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
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
              "runningPlan",
              "day",
              "matE",
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
              "length",
              "size",
              "hasOverFlow",
            ],
          },
          include: [
            {
              model: PlanningBoxTime,
              as: "boxTimes",
              where: whereCondition,
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: timeOverflowPlanning,
              as: "timeOverFlow",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
        },
        {
          model: Order,
          attributes: {
            exclude: [
              "rejectReason",
              "createdAt",
              "updatedAt",
              "day",
              "matE",
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
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
            {
              model: Product,
              attributes: ["typeProduct", "productName", "maKhuon"],
            },
            {
              model: User,
              attributes: ["fullName"],
            },
          ],
        },
      ],
      order: [["sortPlanning", "ASC"]],
      offset: offset,
      limit: currentPageSize,
    });

    const responseData = {
      message: "get all data paper from db",
      data,
      totalPlannings,
      totalPages,
      currentPage,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error("Error add Report Production:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//==============================BOX====================================

export const getAllDataBox = async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, refresh = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  const cacheKey = `data:box:all:${currentPage}`;

  try {
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const planningArray = parsed?.data ?? [];

      if (planningArray.length > 0) {
        if (devEnvironment) console.log("✅ Get PlanningBox from cache");
        return res.status(200).json({
          message: "Get Order from cache",
          data: planningArray,
          totalPlannings: parsed.totalPlannings,
          totalPages: parsed.totalPages,
          currentPage: parsed.currentPage,
        });
      }
    }

    // Điều kiện chỉ lấy đơn đã hoàn thành
    const whereCondition = {
      status: "complete",
      dayCompleted: { [Op.ne]: null },
    };

    // Lấy tất cả PlanningBox có công đoạn hoàn thành
    const plannings = await PlanningBox.findAll({
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
          as: "boxTimes",
          where: whereCondition,
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Order,
          attributes: {
            exclude: ["rejectReason", "createdAt", "updatedAt"],
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: Product,
              attributes: ["typeProduct", "productName", "maKhuon"],
            },
            {
              model: User,
              attributes: ["fullName"],
            },
          ],
        },
      ],
      order: [["planningBoxId", "ASC"]],
    });

    // Flatten data: mỗi công đoạn = 1 dòng
    const flattened = plannings.flatMap((planning) => {
      const plainPlanning: any = planning.toJSON();
      return plainPlanning.boxTimes.map((step: any) => {
        const row = {
          ...plainPlanning,
          boxTime: step,
          timeOverFlow: plainPlanning.timeOverFlow.filter((ov: any) => ov.machine === step.machine),
        };

        // Xóa boxTimes vì không cần nữa
        delete row.boxTimes;
        return row;
      });
    });

    // Pagination theo công đoạn
    const totalPlannings = flattened.length;
    const totalPages = Math.ceil(totalPlannings / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;
    const paginated = flattened.slice(offset, offset + currentPageSize);

    const responseData = {
      message: "get all data box from db",
      data: paginated,
      totalPlannings,
      totalPages,
      currentPage,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error("Error getAllDataBox:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
