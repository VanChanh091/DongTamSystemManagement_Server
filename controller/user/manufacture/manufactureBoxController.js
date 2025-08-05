import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import { Op } from "sequelize";
import PlanningPaper from "../../../models/planning/planningPaper.js";

const redisCache = new Redis();

// Lọc Box theo loại máy
const filterBoxByMachine = (box, machine) => {
  if (!box) return false;

  switch (machine) {
    case "Máy In":
      return box.inMatTruoc > 0 || box.inMatSau > 0;
    case "Máy Bế":
      return box.be === true;
    case "Máy Dán":
      return box.dan_1_Manh === true || box.dan_2_Manh === true;
    case "Máy Cắt Khe":
      return box.catKhe === true;
    case "Máy Cấn Lằn":
      return box.Xa === true;
    case "Máy Cán Màng":
      return box.canMang === true;
    case "Máy Đóng Ghim":
      return box.dongGhim1Manh === true || box.dongGhim2Manh === true;
    default:
      return false;
  }
};

export const getPlanningBox = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res
      .status(400)
      .json({ message: "Missing 'machine' query parameter" });
  }

  try {
    const cacheKey = `planning:box:machine:${machine}`;

    // Làm mới cache nếu cần
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const cachedPlannings = JSON.parse(cachedData);

      const filtered = cachedPlannings.filter((item) => {
        const matchStatus = item.status === "planning";
        const hasDayStart = item.dayStart !== null;
        const hasValidBox = filterBoxByMachine(item.Order?.box, machine);

        return matchStatus && hasDayStart && hasValidBox;
      });

      return res.json({
        message: `get filtered cached planning:box:machine:${machine}`,
        data: filtered,
      });
    }

    // Nếu cache không có, truy vấn DB
    const planning = await PlanningPaper.findAll({
      where: {
        status: "planning",
        chooseMachine: machine,
        dayStart: { [Op.ne]: null },
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
              "totalPrice",
              "vat",
              "rejectReason",
              "createdAt",
              "updatedAt",
            ],
          },
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
            },
            {
              model: Box,
              as: "box",
              attributes: {
                exclude: ["createdAt", "updatedAt"],
              },
            },
          ],
        },
      ],
      order: [["sortPlanning", "ASC"]],
    });

    // Lọc theo máy dựa vào Box
    const filteredPlannings = planning.filter((item) => {
      const hasValidBox = filterBoxByMachine(item.Order.box, machine);
      return hasValidBox;
    });

    // Lưu cache bản chưa lọc theo máy (nếu cần tái sử dụng)
    await redisCache.set(cacheKey, JSON.stringify(planning), "EX", 1800);

    return res.status(200).json({
      message: `get planning by machine: ${machine}`,
      data: filteredPlannings,
    });
  } catch (error) {
    console.error("error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getAllPlanning = async (req, res) => {
  const { step } = req.query;
  try {
    const planning = await PlanningPaper.findAll({
      where: { step: step },
      include: [
        {
          model: Order,
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Box, as: "box" },
          ],
        },
      ],
      order: [["sortPlanning", "ASC"]],
    });

    res.status(200).json({
      message: `get all planning`,
      data: planning,
    });
  } catch (error) {
    console.error("error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
