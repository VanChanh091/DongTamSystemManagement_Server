import Redis from "ioredis";
import ejs from "ejs";
import puppeteer from "puppeteer";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Box from "../../../models/order/box.js";
import PaperConsumptionNorm from "../../../models/planning/paperConsumptionNorm.js";
import Planning from "../../../models/planning/planning.js";
import {
  calculateDao,
  calculateDay,
  calculateDmSong,
  calculateTotalConsumption,
  calculateWeight,
} from "../../../utils/calculator/paperCalculator.js";
import { sequelize } from "../../../configs/connectDB.js";
import { deleteKeysByPattern } from "../../../utils/helper/adminHelper.js";
import { PLANNING_PATH } from "../../../utils/helper/pathHelper.js";
import { getPlanningByField } from "../../../utils/helper/planningHelper.js";

const redisCache = new Redis();

//===============================PLANNING ORDER=====================================

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

    const planning = await Planning.create({
      orderId: orderId,
      status: "planning",
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

//create sub table
const createDataTable = async (planningId, model, norm, layerType) => {
  try {
    const planning = await Planning.findOne({ where: { planningId } });
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

//===============================PRODUCTION QUEUE=====================================

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

//sort planning
const getPlanningByMachineSorted = async (machine, today) => {
  try {
    const data = await Planning.findAll({
      where: {
        chooseMachine: machine,
        status: "planning",
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

    const plannings = await Planning.findAll({
      where: {
        planningId: { [Op.in]: planningIds },
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
export const getPlanningByCustomerName = async (req, res) =>
  getPlanningByField(req, res, "customerName");

//get by flute
export const getPlanningByFlute = async (req, res) =>
  getPlanningByField(req, res, "flute");

//get by ghepKho
export const getPlanningByGhepKho = async (req, res) =>
  getPlanningByField(req, res, "ghepKho");

//export pdf //waiting
export const exportPdfPlanning = async (req, res) => {
  const { planningId, machine } = req.body;

  if (!Array.isArray(planningId) || planningId.length === 0) {
    return res.status(400).json({ message: "Missing or invalid planningId" });
  }

  try {
    const plannings = await PLanning.findAll({
      where: { chooseMachine: machine },
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

    if (!plannings) {
      return res.status(404).json({ message: "Planning not found" });
    }

    // Logic to generate PDF from planning data
    const html = await ejs.renderFile(PLANNING_PATH, { planning: plannings });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=planning_machine${machine}.pdf`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//pause planning
export const pauseOrAcceptLackQtyPLanning = async (req, res) => {
  const { planningIds, newStatus } = req.body;
  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Missing or invalid planningIds" });
    }

    const plannings = await Planning.findAll({
      where: {
        planningId: {
          [Op.in]: planningIds,
        },
      },
    });
    if (plannings.length === 0) {
      return res.status(404).json({ message: "No planning found" });
    }

    const chooseMachine = plannings[0]?.chooseMachine ?? null;

    if (newStatus !== "complete") {
      for (const planning of plannings) {
        if (planning.orderId) {
          console.log("Updating orderId from planning:", planning.orderId);

          const order = await Order.findOne({
            where: { orderId: planning.orderId },
          });
          if (order) {
            order.status = newStatus;
            await order.save();
          }
        }
      }

      for (const planning of plannings) {
        await planning.destroy();
      }
    } else {
      for (const planning of plannings) {
        planning.status = newStatus;
        await planning.save();
      }
    }

    await redisCache.del(`planning:machine:${chooseMachine}`);
    await redisCache.del("orders:userId:status:pending_reject");

    res.status(200).json({
      message: `Update status planning successfully.`,
    });
  } catch (error) {
    console.log("error pause planning", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
