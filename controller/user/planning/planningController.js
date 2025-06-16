import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Box from "../../../models/order/box.js";
import PaperConsumptionNorm from "../../../models/planning/paperConsumptionNorm.js";
import PLanning from "../../../models/planning/planning.js";
import {
  calculateDao,
  calculateDay,
  calculateDmSong,
  calculateTotalConsumption,
  calculateWeight,
} from "../../../utils/calculator/paperCalculator.js";
import { deleteKeysByPattern } from "../../../utils/helper/adminHelper.js";
import Planning from "../../../models/planning/planning.js";
import { Op, where } from "sequelize";
import { sequelize } from "../../../configs/connectDB.js";

const redisCache = new Redis();

//getOrderAccept
export const getOrderAccept = async (req, res) => {
  try {
    const cacheKey = "orders:userId:status:accept";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: "get all order have status:accept from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await Order.findAll({
      where: { status: "accept" },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product },
        { model: Box, as: "box" },
      ],
      order: [["createdAt", "DESC"]],
    });

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 3600);

    res.json({ message: "get all order have status:accept", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//getOrderPLanning
export const getOrderPlanning = async (req, res) => {
  try {
    const cacheKey = "planning:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: "get all order have status:planning from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await PLanning.findAll({
      include: [{ model: Order }, { model: PaperConsumptionNorm, as: "norm" }],
      order: [["createdAt", "DESC"]],
    });

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 3600);

    res.json({ message: "get all order have status:planning", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//planning
export const planningOrder = async (req, res) => {
  const { orderId, newStatus } = req.query;
  const { paperConsumptionNorm, layerType, ...planningData } = req.body;

  try {
    const orderAcceptCacheKey = "orders:userId:status:accept";
    const acceptPlanningCachePattern = `orders:userId:status:accept_planning:*`;

    const order = await Order.findOne({
      where: { orderId: orderId },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product },
        { model: Box, as: "box" },
      ],
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const planning = await PLanning.create({
      orderId: orderId,
      ...planningData,
    });

    // await planning.update({ sortPlanning: planning.planningId });

    // try {
    //   await createDataTable(
    //     planning.planningId,
    //     PaperConsumptionNorm,
    //     paperConsumptionNorm,
    //     layerType
    //   );
    // } catch (error) {
    //   console.error("Error creating related data:", error);
    //   return res.status(500).json({ message: "Failed to create related data" });
    // }

    order.status = newStatus;
    await order.save();

    await redisCache.del(orderAcceptCacheKey);
    await redisCache.del(`planning:machine:${planning.chooseMachine}`);
    await deleteKeysByPattern(redisCache, acceptPlanningCachePattern);

    res.status(201).json({
      message: "Order status updated successfully",
      planning,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createDataTable = async (planningId, model, norm, layerType) => {
  try {
    const planning = await PLanning.findOne({ where: { planningId } });
    if (!planning) throw new Error("Planning not found");

    const order = await Order.findOne({
      where: { orderId: planning.orderId },
    });
    if (!order) throw new Error("Order not found");

    const weight = calculateWeight(
      norm.day,
      norm.songE,
      norm.songB,
      norm.songC,
      norm.matE,
      norm.matB,
      norm.matC
    );

    const DmDay = await calculateDay(
      order.flute,
      order.dvt,
      order.quantityManufacture,
      weight,
      order.acreage,
      layerType,
      "BOTTOM"
    );

    const DmSongE = await calculateDmSong(
      order.dvt,
      norm.songE,
      norm.matE,
      planning.numberChild,
      planning.sizePaperPLaning,
      weight,
      order.acreage,
      planning.runningPlan,
      1.3,
      layerType,
      "SONG_E"
    );

    const DmSongB = await calculateDmSong(
      order.dvt,
      norm.songB,
      norm.matB,
      planning.numberChild,
      planning.sizePaperPLaning,
      weight,
      order.acreage,
      planning.runningPlan,
      1.4,
      layerType,
      "SONG_B"
    );

    const DmSongC = await calculateDmSong(
      order.dvt,
      norm.songC,
      norm.matC,
      planning.numberChild,
      planning.sizePaperPLaning,
      weight,
      order.acreage,
      planning.runningPlan,
      1.45,
      layerType,
      "SONG_C"
    );

    const DmDao = await calculateDao(
      order.dvt,
      order.daoXa,
      weight,
      planning.sizePaperPLaning,
      planning.numberChild,
      order.acreage,
      planning.runningPlan,
      layerType,
      "DAO"
    );

    const totalConsumption = calculateTotalConsumption(
      DmDay,
      DmSongE,
      DmSongB,
      DmSongC,
      DmDao
    );

    console.log(">> DmDay:", DmDay);
    console.log(">> DmSongE:", DmSongE);
    console.log(">> DmSongB:", DmSongB);
    console.log(">> DmSongC:", DmSongC);
    console.log(">> DmDao:", DmDao);
    console.log(">> weight:", weight);
    console.log(">> totalConsumption:", totalConsumption);

    if (norm) {
      await model.create({
        planningId: planningId,
        ...norm,
        weight,
        totalConsumption,
        DmDay,
        DmSongE,
        DmSongB,
        DmSongC,
        DmDao,
      });
    }
  } catch (error) {
    console.error(`Create table ${model} error:`, error);
    throw error;
  }
};

//update status
export const updateStatusPlanning = async (req, res) => {
  const { id, newStatus } = req.query;
  try {
    if (!["pending", "accept", "reject", "planning"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = newStatus;
    await order.save();

    await redisCache.set(`order:${id}`, JSON.stringify(order), "EX", 3600);

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//get planning by machine
export const getPlanningByMachine = async (req, res) => {
  const { machine } = req.query;

  if (!machine) {
    return res
      .status(400)
      .json({ message: "Missing 'machine' query parameter" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      return res.json({
        message: `get all cache planning:machine:${machine}`,
        data: JSON.parse(cachedData),
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await getPlanningByMachineSorted(machine, today);

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    res.status(200).json({
      message: `get planning by machine: ${machine}`,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getPlanningByMachineSorted = async (machine, today) => {
  try {
    const data = await Planning.findAll({
      where: {
        chooseMachine: machine,
      },
      include: [
        {
          model: Order,
          where: {
            dateRequestShipping: { [Op.gte]: today },
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Box, as: "box" },
          ],
        },
        { model: PaperConsumptionNorm, as: "norm" },
      ],
    });

    const withSort = data.filter((item) => item.sortPlanning !== null);
    const noSort = data.filter((item) => item.sortPlanning === null);

    // Sắp xếp đơn có sortPlanning theo thứ tự được lưu
    withSort.sort((a, b) => a.sortPlanning - b.sortPlanning);

    // Sắp xếp đơn chưa có sortPlanning theo logic yêu cầu
    noSort.sort((a, b) => {
      const dateA = a.order?.dateRequestShipping
        ? new Date(a.order.dateRequestShipping)
        : new Date(0);
      const dateB = b.order?.dateRequestShipping
        ? new Date(b.order.dateRequestShipping)
        : new Date(0);

      if (dateA - dateB !== 0) return dateA - dateB;

      const ghepA = a.ghepKho ?? 0;
      const ghepB = b.ghepKho ?? 0;
      if (ghepB - ghepA !== 0) return ghepB - ghepA;

      const fluteA = a.order?.flute ?? "";
      const fluteB = b.order?.flute ?? "";
      return fluteB.localeCompare(fluteA);
    });

    return [...withSort, ...noSort];
  } catch (error) {
    console.error("Error fetching planning by machine:", error);
    throw error;
  }
};

//change machine
export const changeMachinePlanning = async (req, res) => {
  const { planningIds, newMachine } = req.body;
  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Missing or invalid planningIds" });
    }

    const plannings = await PLanning.findAll({
      where: {
        planningId: planningIds,
      },
    });

    if (plannings.length === 0) {
      return res.status(404).json({ message: "No planning found" });
    }

    const oldMachine = plannings[0].chooseMachine;
    const cacheOldKey = `planning:machine:${oldMachine}`;
    const cacheNewKey = `planning:machine:${newMachine}`;

    for (const planning of plannings) {
      planning.chooseMachine = newMachine;
      await planning.save();
    }

    await redisCache.del(cacheOldKey);
    await redisCache.del(cacheNewKey);

    res.status(200).json({ message: "Change machine complete", plannings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//update index planning
export const updateIndexPlanning = async (req, res) => {
  const { updateIndex, machine } = req.body;
  const transaction = await sequelize.transaction();

  if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
    return res.status(400).json({ message: "Missing or invalid updateIndex" });
  }
  try {
    const cachedKey = `planning:machine:${machine}`;

    for (const item of updateIndex) {
      await Planning.update(
        { sortPlanning: item.sortPlanning },
        { where: { planningId: item.planningId }, transaction }
      );
    }

    await transaction.commit();

    await redisCache.del(cachedKey);

    res.status(200).json({ message: "Sort updated successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Update failed:", error);
  }
};

//get by customer name
export const getPlanningByCustomerName = async (req, res) => {
  const { customerName, machine } = req.query;

  try {
    const cacheKey = `planning:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter((item) =>
        item.order?.customer?.customerName
          ?.toLowerCase()
          .includes(customerName.toLowerCase())
      );

      return res.json({
        message: `get all cache planning by customer: ${customerName} on machine ${machine}`,
        data: filteredData,
      });
    }

    const data = await Planning.findAll({
      where: { chooseMachine: machine },
      include: [
        {
          model: Order,
          required: true,
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
              required: true,
              where: {
                customerName: {
                  [Op.like]: `%${customerName}%`,
                },
              },
            },
            { model: Box, as: "box" },
          ],
        },
        { model: PaperConsumptionNorm, as: "norm" },
      ],
    });

    res.status(200).json({
      message: `get planning by customer name: ${customerName}`,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by flute
export const getPlanningByFlute = async (req, res) => {
  const { flute, machine } = req.query;
  try {
    const cacheKey = `planning:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter((item) =>
        item.order?.flute.toLowerCase().includes(flute.toLowerCase())
      );

      return res.json({
        message: `get all cache planning by flute: ${flute} on machine ${machine}`,
        data: filteredData,
      });
    }

    const data = await PLanning.findAll({
      where: { chooseMachine: machine },
      include: [
        {
          model: Order,
          required: true,
          where: { flute: { [Op.like]: `%${flute}%` } },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Box, as: "box" },
          ],
        },
        { model: PaperConsumptionNorm, as: "norm" },
      ],
    });

    res.status(200).json({
      message: `get planning by flute: ${flute}`,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by ghepKho
export const getPlanningByGhepKho = async (req, res) => {
  const { ghepKho, machine } = req.query;
  try {
    const cacheKey = `planning:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter(
        (item) => item?.ghepKho == ghepKho
      );

      return res.json({
        message: `get all cache planning by customer: ${ghepKho} on machine ${machine}`,
        data: filteredData,
      });
    }

    const data = await PLanning.findAll({
      where: { chooseMachine: machine, ghepKho: ghepKho },
      include: [
        {
          model: Order,
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Box, as: "box" },
          ],
        },
        { model: PaperConsumptionNorm, as: "norm" },
      ],
    });

    res.status(200).json({
      message: `get planning by ghepKho: ${ghepKho}`,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//export pdf
const exportPdfPlanning = async (req, res) => {
  const { planningId } = req.query;

  if (!Array.isArray(planningId) || planningId.length === 0) {
    return res.status(400).json({ message: "Missing or invalid planningId" });
  }

  try {
    const planning = await PLanning.findOne({
      where: { planningId },
      include: [
        { model: Order, include: [{ model: Customer }] },
        { model: PaperConsumptionNorm, as: "norm" },
      ],
    });

    if (!planning) {
      return res.status(404).json({ message: "Planning not found" });
    }

    // Logic to generate PDF from planning data
    // ...

    res.status(200).json({ message: "PDF generated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
