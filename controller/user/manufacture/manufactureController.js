import Redis from "ioredis";
import Planning from "../../../models/planning/planning.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import Order from "../../../models/order/order.js";
import { Op } from "sequelize";

const redisCache = new Redis();

//get planning machine paper
export const getPlanningPaper = async (req, res) => {
  const { machine, step, refresh = false } = req.query;

  if (!machine || !step) {
    return res
      .status(400)
      .json({ message: "Missing machine or step query parameter" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;

    //refresh cache
    if (refresh === true) {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: `get all cache planning:machine:${machine}`,
        data: JSON.parse(cachedData),
      });
    }

    const whereCondition = {
      chooseMachine: machine,
      status: ["planning", "lackQty"],
      dayStart: { [Op.ne]: null },
    };

    if (step) {
      whereCondition.step = step;
    }

    const planning = await Planning.findAll({
      where: whereCondition,
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
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
      message: `get planning by machine: ${machine}`,
      data: allPlannings,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get planning machine box
export const getPlanningBox = async (req, res) => {
  const { machine, step } = req.query;

  if (!machine || !step) {
    return res
      .status(400)
      .json({ message: "Missing machine or step query parameter" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;
    //refresh cache
    await redisCache.del(cacheKey);

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: `get all cache planning:machine:${machine}`,
        data: JSON.parse(cachedData),
      });
    }

    const whereCondition = {
      chooseMachine: machine,
      status: ["planning", "lackQty"],
    };

    if (step) {
      whereCondition.step = step;
    }

    const planning = await Planning.findAll({
      where: whereCondition,
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
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
      message: `get planning by machine: ${machine}`,
      data: planning,
    });
  } catch (error) {
    console.error(error);
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

  const transaction = await Planning.sequelize.transaction();
  try {
    // 1. Tìm kế hoạch hiện tại
    const planning = await Planning.findOne({
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

      //tìm đơn phụ thuộc
      const dependentPlanning = await Planning.findOne({
        where: { dependOnPlanningId: planning.planningId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (dependentPlanning) {
        await dependentPlanning.update({ status: "planning" }, { transaction });
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
