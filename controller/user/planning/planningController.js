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
import MachinePaper from "../../../models/admin/machinePaper.js";

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
      const wavePriorityMap = { C: 3, B: 2, E: 1 };

      // Hàm lấy số lớp
      const getLayer = (flute) => {
        if (!flute || flute.length < 1) return 0;
        return parseInt(flute.trim()[0]) || 0;
      };

      // Hàm chuyển flute thành danh sách ưu tiên từng sóng
      const getWavePriorityList = (flute) => {
        if (!flute || flute.length < 2) return [];
        const waves = flute.trim().slice(1).toUpperCase().split("");
        return waves.map((w) => wavePriorityMap[w] || 0);
      };

      // 1. ghepKho
      const ghepA = a.ghepKho ?? 0;
      const ghepB = b.ghepKho ?? 0;
      if (ghepB !== ghepA) return ghepB - ghepA;

      // 2. Số lớp
      const layerA = getLayer(a.Order?.flute);
      const layerB = getLayer(b.Order?.flute);
      if (layerB !== layerA) return layerB - layerA;

      // 3. So sánh sóng từng phần tử
      const waveA = getWavePriorityList(a.Order?.flute);
      const waveB = getWavePriorityList(b.Order?.flute);
      const maxLength = Math.max(waveA.length, waveB.length);

      for (let i = 0; i < maxLength; i++) {
        const priA = waveA[i] ?? 0;
        const priB = waveB[i] ?? 0;
        if (priB !== priA) return priB - priA;
      }

      return 0;
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
    res.status(500).json({ message: "Sort updated failed", error });
  }
};

//update planning by time running
export const calculateTimeRunning = async (req, res) => {
  const { machine } = req.query;
  const { dayStart, timeStart, totalTimeWorking, updatePlanning } = req.body;

  if (!Array.isArray(updatePlanning) || updatePlanning.length === 0) {
    return res
      .status(400)
      .json({ message: "Missing or invalid updatePlanning" });
  }

  const transaction = await sequelize.transaction();

  try {
    const machineInfo = await MachinePaper.findOne({
      where: { machineName: machine },
    });

    if (!machineInfo) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Khởi tạo currentTime dựa vào timeStart (không liên quan đến dayStart)
    let currentTime = parseTimeOnly(timeStart);
    let endOfWorkTime = new Date(currentTime);
    endOfWorkTime.setHours(currentTime.getHours() + totalTimeWorking);

    // Sắp xếp updatePlanning theo sortPlanning
    const sortedPlannings = [...updatePlanning].sort(
      (a, b) => a.sortPlanning - b.sortPlanning
    );

    let lastGhepKho = null;
    let updatedPlannings = [];

    for (let i = 0; i < sortedPlannings.length; i++) {
      const planning = sortedPlannings[i];
      const { planningId, runningPlan, ghepKho, Order, sortPlanning } =
        planning;

      const numberChild = Order?.numberChild || 1;
      const flute = Order?.flute || "3B";
      const speed = getSpeed(flute, machine, machineInfo);
      const performance = machineInfo.machinePerformance;
      const totalLength = runningPlan / numberChild;

      const isFirst = i === 0;
      const isSameSize = !isFirst && ghepKho === lastGhepKho;

      const changeTime =
        machine === "Máy Quấn Cuồn"
          ? machineInfo.timeChangeSize
          : isFirst
          ? machineInfo.timeChangeSize
          : isSameSize
          ? machineInfo.timeChangeSameSize
          : machineInfo.timeChangeSize;

      // 👉 Cộng thời gian đổi khổ vào currentTime
      currentTime.setMinutes(currentTime.getMinutes());

      // 👉 Tính thời gian sản xuất (dựa vào chiều dài / tốc độ / hiệu suất)
      const productionMinutes = Math.ceil(
        (changeTime + totalLength / speed) * (performance / 100)
      );

      // 👉 Ước lượng thời gian kết thúc tạm để tính thời gian nghỉ
      const tempEndTime = new Date(currentTime);
      tempEndTime.setMinutes(tempEndTime.getMinutes() + productionMinutes);

      // 👉 Cộng thêm nếu chồng vào giờ nghỉ
      const extraBreak = isDuringBreak(currentTime, tempEndTime);

      // 👉 Tổng thời gian kết thúc đơn hàng
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + productionMinutes + extraBreak);

      // 👉 Nếu vượt quá giờ làm → chuyển sang ngày hôm sau
      if (endTime > endOfWorkTime) {
        const overflowMinutes = (endTime - endOfWorkTime) / 60000;

        // Khởi tạo lại thời gian bắt đầu của ngày hôm sau
        const nextDayStart = parseTimeOnly(timeStart);
        nextDayStart.setDate(nextDayStart.getDate() + 1);

        // Cộng thêm overflowMinutes vào timestamp
        currentTime = new Date(
          nextDayStart.getTime() + overflowMinutes * 60 * 1000
        );

        console.log(
          `⏭️ Vượt quá giờ làm. Dời sang ngày hôm sau, tiếp tục từ: ${formatTimeToHHMMSS(
            currentTime
          )}`
        );
      } else {
        currentTime = new Date(endTime);
      }

      // 👉 Log kiểm tra
      console.log(
        `🧾sort=${sortPlanning} | ghepKho=${ghepKho} | last=${lastGhepKho} | isSameSize=${isSameSize} | changeTime=${changeTime}p | ProductionTime=${productionMinutes.toFixed(
          2
        )}p | Break=${extraBreak}p | End=${formatTimeToHHMMSS(endTime)}`
      );

      // 👉 Cập nhật DB
      await Planning.update(
        {
          dayStart,
          timeRunning: formatTimeToHHMMSS(endTime),
        },
        {
          where: { planningId },
          transaction,
        }
      );

      updatedPlannings.push({
        planningId,
        dayStart,
        timeRunning: formatTimeToHHMMSS(endTime),
      });

      // 👉 Lưu lại khổ giấy cho đơn tiếp theo
      lastGhepKho = ghepKho;
    }

    await transaction.commit();
    await redisCache.del(`planning:machine:${machine}`);

    // Trả về data cập nhật cùng với thông báo thành công
    res.status(200).json({
      message: "✅ Updated timeRunning thành công",
      data: updatedPlannings,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Update failed:", error);
    res.status(500).json({
      message: "Failed to update planning by time running",
      error: error.message,
    });
  }
};

const parseTimeOnly = (timeStr) => {
  const [h, min] = timeStr.split(":").map(Number);
  const now = new Date();
  now.setHours(h);
  now.setMinutes(min);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now;
};

const formatTimeToHHMMSS = (date) => {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
};

const getSpeed = (flute, machineName, machineInfo) => {
  const numberLayer = parseInt(flute[0]);
  if (machineName === "Máy 2 Lớp") return machineInfo.speed2Layer;
  if (machineName === "Máy Quấn Cuồn") return machineInfo.paperRollSpeed;
  const speed = machineInfo[`speed${numberLayer}Layer`];
  console.log(speed);
  if (!speed) {
    throw new Error(
      `❌ Không tìm thấy tốc độ cho flute=${flute}, machine=${machineName}`
    );
  }
  return speed;
};

const isDuringBreak = (start, end) => {
  const breakTimes = [
    { start: "11:30", end: "12:00" },
    { start: "17:00", end: "17:30" },
    { start: "02:00", end: "02:45" },
  ];

  const dayStr = start.toISOString().split("T")[0];
  let totalOverlap = 0;

  for (const brk of breakTimes) {
    const bStart = new Date(`${dayStr}T${brk.start}:00`);
    const bEnd = new Date(`${dayStr}T${brk.end}:00`);
    if (end > bStart && start < bEnd) {
      const overlapStart = start < bStart ? bStart : start;
      const overlapEnd = end > bEnd ? bEnd : end;
      totalOverlap += (overlapEnd - overlapStart) / 60000;
    }
  }

  return totalOverlap;
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

//get by orderId
export const getPlanningByOrderId = async (req, res) => {
  const { orderId, machine } = req.query;

  if (!machine || !orderId) {
    return res.status(400).json({ message: "Thiếu machine hoặc orderId" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data planning from Redis");
      const parsedData = JSON.parse(cachedData);

      // Tìm kiếm tương đối trong cache
      const filteredData = parsedData.filter((item) =>
        item.orderId.toLowerCase().includes(orderId.toLowerCase())
      );

      return res.json({
        message: `Get planning by orderId from cache`,
        data: filteredData,
      });
    }

    const planning = await Planning.findAll({
      where: {
        orderId: {
          [Op.like]: `%${orderId}%`,
        },
      },
      include: [
        {
          model: Order,
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
            },
            { model: Box, as: "box" },
          ],
        },
      ],
    });

    if (!planning || planning.length === 0) {
      return res.status(404).json({
        message: `Không tìm thấy kế hoạch với orderId chứa: ${orderId}`,
      });
    }

    return res.status(200).json({
      message: "Get planning by orderId from db",
      data: planning,
    });
  } catch (error) {
    console.error("❌ Lỗi khi tìm orderId:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

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
