import { Op } from "sequelize";
import Redis from "ioredis";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Box from "../../models/order/box.js";
import PaperConsumptionNorm from "../../models/planning/paperConsumptionNorm.js";
import Planning from "../../models/planning/planning.js";

const redisCache = new Redis();

export const getPlanningByField = async (req, res, field) => {
  const { machine } = req.query;
  const value = req.query[field];

  if (!machine || !value) {
    return res.status(400).json({
      message: "Thiếu machine hoặc giá trị tìm kiếm",
    });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);

      const filtered = parsed.filter((item) => {
        const order = item.Order;
        if (field === "customerName") {
          return order?.Customer?.customerName
            ?.toLowerCase()
            .includes(value.toLowerCase());
        } else if (field === "flute") {
          return order?.flute?.toLowerCase().includes(value.toLowerCase());
        } else if (field === "ghepKho") {
          return item?.ghepKho == value;
        }
        return false;
      });

      return res.json({
        message: `Lọc planning theo ${field}: ${value} (cache)`,
        data: filtered,
      });
    }

    // Build query nếu không có cache
    const whereClause = { chooseMachine: machine };
    if (field === "ghepKho") {
      whereClause.ghepKho = value;
    }

    const orderInclude = {
      model: Order,
      required: true,
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Box, as: "box" },
      ],
    };

    // Thêm where vào order/customer nếu cần
    if (field === "flute") {
      orderInclude.where = {
        flute: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    if (field === "customerName") {
      orderInclude.include[0].required = true;
      orderInclude.include[0].where = {
        customerName: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    const data = await Planning.findAll({
      where: whereClause,
      include: [orderInclude, { model: PaperConsumptionNorm, as: "norm" }],
    });

    return res.status(200).json({
      message: `Lọc planning theo ${field}: ${value}`,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
