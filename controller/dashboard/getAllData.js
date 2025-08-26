import Redis from "ioredis";
import PlanningPaper from "../../models/planning/planningPaper.js";
import timeOverflowPlanning from "../../models/planning/timeOverFlowPlanning.js";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Box from "../../models/order/box.js";
import Product from "../../models/product/product.js";
import User from "../../models/user/user.js";
import { Op, where } from "sequelize";

const redisCache = new Redis();

export const getAllDataPaper = async (req, res) => {
  const { page, pageSize, refresh = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  try {
    const cacheKey = "data:paper:all";

    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);

      let filteredData = cachedPlannings.filter((item) => {
        const matchStatus = item.status === "complete";
        const hasDayCompleted = item.dayCompleted !== null;
        return matchStatus && hasDayCompleted;
      });

      if (filteredData) {
        console.log("✅ Get Planning from cache");
        return res.status(200).json({
          message: "Get Planning from cache",
          data: filteredData,
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

    const totalPlannings = await Order.count({ where: { whereCondition } });
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
      order: [["sortPlanning", "ASC"]],
      offset: offset,
      limit: currentPageSize,
    });

    await redisCache.set(
      cacheKey,
      JSON.stringify({ data, totalPlannings, totalPages, currentPage }),
      "EX",
      1800
    );

    res.status(200).json({
      message: "get all data from db",
      data,
      totalPlannings,
      totalPages,
      currentPage,
    });
  } catch (error) {
    // await transaction.rollback();
    console.error("Error add Report Production:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
