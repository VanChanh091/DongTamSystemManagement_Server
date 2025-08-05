import Redis from "ioredis";
import PlanningPaper from "../../../models/planning/planningPaper.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import Order from "../../../models/order/order.js";
import { Op } from "sequelize";

const redisCache = new Redis();

//get planning machine paper
export const getPlanningPaper = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res.status(400).json({ message: "Missing machine query parameter" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;

    //refresh cache
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      let cachedPlannings = JSON.parse(cachedData);

      const filtered = cachedPlannings.filter((item) => {
        const matchStatus = ["planning", "lackQty"].includes(item.status);
        const hasDayStart = item.dayStart !== null;

        return matchStatus && hasDayStart;
      });

      return res.json({
        message: `get filtered cache planning:machine:${machine}`,
        data: filtered,
      });
    }

    const whereCondition = {
      chooseMachine: machine,
      status: ["planning", "lackQty"],
      dayStart: { [Op.ne]: null },
    };

    const planning = await PlanningPaper.findAll({
      where: whereCondition,
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
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
            { model: Customer, attributes: ["customerName", "companyName"] },
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

    const allPlannings = [];

    planning.forEach((p) => {
      const original = {
        ...p.toJSON(),
        hasOverflow: false,
        timeRunning: p.timeRunning,
        dayStart: p.dayStart,
      };
      allPlannings.push(original);

      if (p.timeOverFlow) {
        allPlannings.push({
          ...original,
          hasOverflow: true,
          timeRunning: p.timeOverFlow.overflowTimeRunning,
          dayStart: p.timeOverFlow.overflowDayStart,
        });
      }
    });

    await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);

    res.status(200).json({
      message: `get planning paper by machine: ${machine}`,
      data: allPlannings,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//create report for machine
export const addReportPaper = async (req, res) => {
  const { planningId } = req.query;
  const { qtyProduced, qtyWasteNorm, dayCompleted, ...otherData } = req.body;
  const { role, permissions: userPermissions } = req.user;

  if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const transaction = await PlanningPaper.sequelize.transaction();
  try {
    // 1. Tìm kế hoạch hiện tại
    const planning = await PlanningPaper.findOne({
      where: { planningId },
      include: [{ model: timeOverflowPlanning, as: "timeOverFlow" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!planning) {
      await transaction.rollback();
      return res.status(404).json({ message: "Planning not found" });
    }

    const machine = planning.chooseMachine;

    //check permission for machine
    if (role !== "admin" && role !== "manager") {
      if (!userPermissions.includes(machine)) {
        await transaction.rollback();
        return res.status(403).json({
          message: `Access denied: You don't have permission to report for machine ${machine}`,
        });
      }
    }

    // 2. Cộng dồn số lượng mới vào số đã có
    const newQtyProduced =
      Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
    const newQtyWasteNorm =
      Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);

    // 3. Cập nhật kế hoạch với số liệu mới
    await planning.update(
      {
        qtyProduced: newQtyProduced,
        qtyWasteNorm: newQtyWasteNorm,
        dayCompleted,
        ...otherData,
      },
      { transaction }
    );

    // 4. Kiểm tra đã đủ sản lượng chưa
    if (newQtyProduced >= planning.runningPlan) {
      await planning.update({ status: "complete" }, { transaction });
      //nếu có đơn tràn
      if (planning.hasOverFlow) {
        await timeOverflowPlanning.update(
          { status: "complete" },
          { where: { planningId }, transaction }
        );
      }
    } else {
      await planning.update({ status: "lackQty" }, { transaction });
    }

    // 5. Commit + clear cache
    await transaction.commit();
    await redisCache.del(`planning:machine:${machine}`);

    res.status(200).json({
      message: "Add Report Production successfully",
      data: {
        planningId,
        qtyProduced: newQtyProduced,
        qtyWasteNorm: newQtyWasteNorm,
        dayCompleted,
        ...otherData,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error add Report Production:", error);
    res.status(500).json({ message: "Server error" });
  }
};
