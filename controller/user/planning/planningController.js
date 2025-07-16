import Redis from "ioredis";
import ejs from "ejs";
import puppeteer from "puppeteer";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Box from "../../../models/order/box.js";
import Planning from "../../../models/planning/planning.js";
import { sequelize } from "../../../configs/connectDB.js";
import { deleteKeysByPattern } from "../../../utils/helper/adminHelper.js";
import { PLANNING_PATH } from "../../../utils/helper/pathHelper.js";
import { getPlanningByField } from "../../../utils/helper/planningHelper.js";
import MachinePaper from "../../../models/admin/machinePaper.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import WasteNorm from "../../../models/admin/wasteNorm.js";
import WaveCrestCoefficient from "../../../models/admin/waveCrestCoefficient.js";

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

//planning order
export const planningOrder = async (req, res) => {
  const { orderId, newStatus } = req.query;
  const planningData = req.body;

  if (!orderId || !newStatus) {
    return res.status(404).json({ message: "Missing orderId or newStatus" });
  }

  try {
    // 1) Lấy thông tin Order kèm các quan hệ
    const order = await Order.findOne({
      where: { orderId },
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        { model: Product },
        { model: Box, as: "box" },
      ],
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 2) Lấy thông số định mức và hệ số sóng cho máy đã chọn
    const { chooseMachine } = planningData;
    const wasteNorm = await WasteNorm.findOne({
      where: { machineName: chooseMachine },
    });
    const waveCoeff = await WaveCrestCoefficient.findOne({
      where: { machineName: chooseMachine },
    });

    if (!wasteNorm || !waveCoeff) {
      throw new Error(
        `WasteNorm or WaveCrestCoefficient not found for machine: ${chooseMachine}`
      );
    }

    // 3) Parse cấu trúc giấy thành mảng lớp
    const structStr = [
      planningData.dayReplace,
      planningData.songEReplace,
      planningData.matEReplace,
      planningData.songBReplace,
      planningData.matBReplace,
      planningData.songCReplace,
      planningData.matCReplace,
    ]
      .filter(Boolean)
      .join("/");

    const parseStructure = (str) =>
      str.split("/").map((seg) => {
        if (/^[EBC]/.test(seg)) return { kind: "flute", code: seg };
        return {
          kind: "liner",
          thickness: parseFloat(seg.replace(/\D+/g, "")),
        };
      });

    const layers = parseStructure(structStr);

    // 4) Xác định loại sóng từ đơn hàng (flute: "5EB" => ["E", "B"])
    const waveTypes = (order.flute.match(/[EBC]/gi) || []).map((s) =>
      s.toUpperCase()
    );
    const roundSmart = (num) => Math.round(num * 100) / 100;

    // 5) Hàm tính phế liệu
    const calculateWaste = (
      layers,
      ghepKho,
      wasteNorm,
      waveCoeff,
      runningPlan,
      numberChild,
      waveTypes
    ) => {
      const gkTh = ghepKho / 100;
      let flute = { E: 0, B: 0, C: 0 };
      let softLiner = 0;
      let countE = 0;

      for (let i = 0; i < layers.length; i++) {
        const L = layers[i];
        if (L.kind === "flute") {
          const letter = L.code[0].toUpperCase();
          if (!waveTypes.includes(letter)) continue;

          const fluteTh = parseFloat(L.code.replace(/\D+/g, "")) / 1000;
          const prev = layers[i - 1];
          const linerBefore =
            prev && prev.kind === "liner" ? prev.thickness / 1000 : 0;

          let coef = 0;
          if (letter === "E") {
            coef = countE === 0 ? waveCoeff.fluteE_1 : waveCoeff.fluteE_2;
            countE++;
          } else {
            coef = waveCoeff[`flute${letter}`] || 0;
          }

          const loss =
            gkTh * wasteNorm.waveCrest * linerBefore +
            gkTh * wasteNorm.waveCrest * fluteTh * coef;

          flute[letter] += loss;
        }
      }

      // 5.1) Lớp liner cuối cùng
      const lastLiner = [...layers].reverse().find((l) => l.kind === "liner");
      if (lastLiner) {
        softLiner =
          gkTh * wasteNorm.waveCrestSoft * (lastLiner.thickness / 1000);
      }

      // 5.2) Tính hao phí, dao, tổng hao hụt
      const bottom = flute.E + flute.B + flute.C + softLiner;
      const haoPhi =
        (runningPlan / numberChild) *
        (bottom / wasteNorm.waveCrestSoft) *
        (wasteNorm.lossInProcess / 100);
      const knife =
        (bottom / wasteNorm.waveCrestSoft) *
        wasteNorm.lossInSheetingAndSlitting;
      const totalLoss = flute.E + flute.B + flute.C + haoPhi + knife + bottom;

      return {
        fluteE: roundSmart(flute.E),
        fluteB: roundSmart(flute.B),
        fluteC: roundSmart(flute.C),
        bottom: roundSmart(bottom),
        haoPhi: roundSmart(haoPhi),
        knife: roundSmart(knife),
        totalLoss: roundSmart(totalLoss),
      };
    };

    // 6) Tạo kế hoạch làm giấy tấm (step: lam-giay-tam)
    const paperPlan = await Planning.create({
      orderId,
      step: "paper",
      status: "planning",
      ...planningData,
    });

    // 7) Tính phế liệu và cập nhật lại plan giấy tấm
    const waste = calculateWaste(
      layers,
      planningData.ghepKho,
      wasteNorm,
      waveCoeff,
      planningData.runningPlan,
      order.numberChild,
      waveTypes
    );
    Object.assign(paperPlan, waste);
    await paperPlan.save();

    let boxPlan = null;

    // 8) Nếu đơn hàng có làm thùng, tạo thêm kế hoạch lam-thung (waiting)
    if (order.isBox) {
      boxPlan = await Planning.create({
        orderId,
        chooseMachine: planningData.chooseMachine,
        lengthPaperPlanning: planningData.lengthPaperPlanning,
        sizePaperPLaning: planningData.sizePaperPLaning,
        runningPlan: planningData.runningPlan,
        ghepKho: planningData.ghepKho,
        step: "box",
        dependOnPlanningId: paperPlan.planningId,
        status: "waiting",
      });
    }

    // 9) Cập nhật trạng thái đơn hàng
    order.status = newStatus;
    await order.save();

    // 10) Xoá cache
    await redisCache.del("orders:userId:status:accept");
    await redisCache.del(`planning:machine:${chooseMachine}`);
    await deleteKeysByPattern(
      redisCache,
      `orders:userId:status:accept_planning:*`
    );

    // 11) Trả kết quả
    return res.status(201).json({
      message: "Đã tạo kế hoạch thành công.",
      planning: [paperPlan, boxPlan].filter(Boolean),
    });
  } catch (error) {
    console.error("planningOrder error:", error);
    return res.status(500).json({ error: error.message });
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
const getPlanningByMachineSorted = async (machine) => {
  try {
    const data = await Planning.findAll({
      where: {
        chooseMachine: machine,
        status: ["planning", "waiting"],
      },
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
    });

    const withSort = data.filter((item) => item.sortPlanning !== null);
    const noSort = data.filter((item) => item.sortPlanning === null);

    // Sắp xếp đơn có sortPlanning theo thứ tự được lưu
    withSort.sort((a, b) => a.sortPlanning - b.sortPlanning);

    // Sắp xếp đơn chưa có sortPlanning theo logic yêu cầu
    noSort.sort((a, b) => {
      const wavePriorityMap = { C: 3, B: 2, E: 1 };

      const getLayer = (flute) => {
        if (!flute || flute.length < 1) return 0;
        return parseInt(flute.trim()[0]) || 0;
      };

      const getWavePriorityList = (flute) => {
        if (!flute || flute.length < 2) return [];
        const waves = flute.trim().slice(1).toUpperCase().split("");
        return waves.map((w) => wavePriorityMap[w] || 0);
      };

      const ghepA = a.ghepKho ?? 0;
      const ghepB = b.ghepKho ?? 0;
      if (ghepB !== ghepA) return ghepB - ghepA;

      const layerA = getLayer(a.Order?.flute);
      const layerB = getLayer(b.Order?.flute);
      if (layerB !== layerA) return layerB - layerA;

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

    const sortedPlannings = [...withSort, ...noSort];

    // 👉 Gộp overflow vào liền sau đơn gốc
    const allPlannings = [];

    sortedPlannings.forEach((planning) => {
      const original = {
        ...planning.toJSON(),
        isOverflow: false,
        timeRunning: planning.timeRunning,
        dayStart: planning.dayStart,
      };
      allPlannings.push(original);

      if (planning.timeOverFlow) {
        allPlannings.push({
          ...original,
          isOverflow: true,
          timeRunning: planning.timeOverFlow.overflowTimeRunning,
          dayStart: planning.timeOverFlow.overflowDayStart,
        });
      }
    });

    return allPlannings;
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
      planning.sortPlanning = null;
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
export const updateIndex_TimeRunning = async (req, res) => {
  const { machine } = req.query;
  const { updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;

  if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
    return res.status(400).json({ message: "Missing or invalid updateIndex" });
  }

  const transaction = await sequelize.transaction();
  const cachedKey = `planning:machine:${machine}`;

  try {
    // 1. Cập nhật sortPlanning
    await updateSortPlanning(updateIndex, transaction);

    // 2. Lấy lại danh sách planning đã được update
    const sortedPlannings = await getSortedPlannings(updateIndex, transaction);

    // 3. Tính toán thời gian chạy cho từng planning
    const updatedPlannings = await calculateTimeRunningPlannings({
      machine,
      machineInfo: await getMachineInfo(machine, transaction),
      dayStart,
      timeStart,
      totalTimeWorking,
      plannings: sortedPlannings,
      transaction,
    });

    await transaction.commit();
    await redisCache.del(cachedKey);

    return res.status(200).json({
      message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
      data: updatedPlannings,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Update failed:", error);
    return res.status(500).json({
      message: "❌ Lỗi khi cập nhật và tính toán thời gian",
      error: error.message,
    });
  }
};

const updateSortPlanning = async (updateIndex, transaction) => {
  for (const item of updateIndex) {
    await Planning.update(
      { sortPlanning: item.sortPlanning },
      { where: { planningId: item.planningId }, transaction }
    );
  }
};

const getSortedPlannings = async (updateIndex, transaction) => {
  return await Planning.findAll({
    where: { planningId: updateIndex.map((i) => i.planningId) },
    include: [{ model: Order }],
    order: [["sortPlanning", "ASC"]],
    transaction,
  });
};

const getMachineInfo = async (machine, transaction) => {
  const machineInfo = await MachinePaper.findOne({
    where: { machineName: machine },
    transaction,
  });
  if (!machineInfo) throw new Error("Machine not found");
  return machineInfo;
};

const calculateTimeRunningPlannings = async ({
  machine,
  machineInfo,
  dayStart,
  timeStart,
  totalTimeWorking,
  plannings,
  transaction,
}) => {
  let currentTime = parseTimeOnly(timeStart);
  let currentDay = new Date(dayStart);
  let lastGhepKho = null;
  const updated = [];

  for (let i = 0; i < plannings.length; i++) {
    const data = await calculateTimeForOnePlanning({
      planning: plannings[i],
      machine,
      machineInfo,
      currentTime,
      currentDay,
      timeStart,
      totalTimeWorking,
      lastGhepKho,
      transaction,
      isFirst: i === 0,
    });

    currentTime = data.nextTime;
    currentDay = data.nextDay;
    lastGhepKho = data.ghepKho;
    updated.push(data.result);
  }

  return updated;
};

const calculateTimeForOnePlanning = async ({
  planning,
  machine,
  machineInfo,
  currentTime,
  currentDay,
  timeStart,
  totalTimeWorking,
  lastGhepKho,
  transaction,
  isFirst,
}) => {
  const { planningId, runningPlan, ghepKho, sortPlanning, Order } = planning;
  const numberChild = Order?.numberChild || 1;
  const flute = Order?.flute || "3B";
  const speed = getSpeed(flute, machine, machineInfo);
  const performance = machineInfo.machinePerformance;
  const totalLength = runningPlan / numberChild;

  const isSameSize = !isFirst && ghepKho === lastGhepKho;

  const changeTime =
    machine === "Máy Quấn Cuồn"
      ? machineInfo.timeChangeSize
      : isFirst
      ? machineInfo.timeChangeSize
      : isSameSize
      ? machineInfo.timeChangeSameSize
      : machineInfo.timeChangeSize;

  //công thức
  const productionMinutes = Math.ceil(
    (changeTime + totalLength / speed) / (performance / 100)
  );

  // ✅ Tính thời gian bắt đầu và kết thúc ca làm việc cho currentDay
  let startOfWorkTime = new Date(currentDay);
  const [h, m] = timeStart.split(":").map(Number); // ✅ đúng
  startOfWorkTime.setHours(h, m, 0, 0);

  let endOfWorkTime = new Date(startOfWorkTime);
  endOfWorkTime.setHours(startOfWorkTime.getHours() + totalTimeWorking);

  // ✅ Nếu currentTime < start → set currentTime = start
  if (currentTime < startOfWorkTime) {
    currentTime = new Date(startOfWorkTime);
  }

  // ✅ Nếu currentTime >= end → nhảy sang hôm sau
  if (currentTime >= endOfWorkTime) {
    currentDay.setDate(currentDay.getDate() + 1);
    startOfWorkTime.setDate(startOfWorkTime.getDate() + 1);
    endOfWorkTime.setDate(endOfWorkTime.getDate() + 1);
    currentTime = new Date(startOfWorkTime);
  }

  let tempEndTime = new Date(currentTime);
  tempEndTime.setMinutes(tempEndTime.getMinutes() + productionMinutes);
  const extraBreak = isDuringBreak(currentTime, tempEndTime);

  let predictedEndTime = new Date(currentTime);
  predictedEndTime.setMinutes(
    predictedEndTime.getMinutes() + productionMinutes + extraBreak
  );

  let currentPlanningDayStart = currentDay.toISOString().split("T")[0];
  let timeRunningForPlanning = formatTimeToHHMMSS(predictedEndTime);
  let hasOverFlow = false;
  let overflowDayStart = null;
  let overflowTimeRunning = null;
  let overflowMinutes = null;

  if (predictedEndTime > endOfWorkTime) {
    hasOverFlow = true;
    const totalOverflowMinutes = (predictedEndTime - endOfWorkTime) / 60000;

    timeRunningForPlanning = formatTimeToHHMMSS(endOfWorkTime);

    let nextDay = new Date(currentDay);
    nextDay.setDate(nextDay.getDate() + 1);
    overflowDayStart = nextDay.toISOString().split("T")[0];

    let overflowStartTime = parseTimeOnly(timeStart);
    overflowStartTime.setDate(overflowStartTime.getDate() + 1);

    let actualOverflowEndTime = new Date(overflowStartTime);
    actualOverflowEndTime.setMinutes(
      actualOverflowEndTime.getMinutes() + totalOverflowMinutes
    );

    overflowTimeRunning = formatTimeToHHMMSS(actualOverflowEndTime);
    overflowMinutes = `${Math.round(totalOverflowMinutes)} phút`;

    currentTime = new Date(actualOverflowEndTime);
    currentDay = new Date(overflowDayStart);

    await timeOverflowPlanning.destroy({ where: { planningId }, transaction });

    await timeOverflowPlanning.create(
      {
        planningId,
        overflowDayStart,
        overflowTimeRunning,
        sortPlanning,
      },
      { transaction }
    );
  } else {
    currentTime = new Date(predictedEndTime);
    currentPlanningDayStart = currentDay.toISOString().split("T")[0];
    timeRunningForPlanning = formatTimeToHHMMSS(currentTime);

    await timeOverflowPlanning.destroy({ where: { planningId }, transaction });
  }

  await Planning.update(
    {
      dayStart: currentPlanningDayStart,
      timeRunning: timeRunningForPlanning,
      hasOverFlow,
    },
    { where: { planningId }, transaction }
  );

  const result = {
    planningId,
    dayStart: currentPlanningDayStart,
    timeRunning: timeRunningForPlanning,
  };

  if (hasOverFlow) {
    result.overflowDayStart = overflowDayStart;
    result.overflowTimeRunning = overflowTimeRunning;
    result.overflowMinutes = overflowMinutes;
  }

  console.log("🔍 Chi tiết tính toán đơn hàng:");
  console.log({
    planningId,
    ghepKho,
    lastGhepKho,
    isSameSize,
    changeTime: `${changeTime} phút`,
    productionTime: `${productionMinutes} phút`,
    breakTime: `${extraBreak} phút`,
    predictedEndTime: formatTimeToHHMMSS(predictedEndTime),
    endOfWorkTime: formatTimeToHHMMSS(endOfWorkTime),
    hasOverFlow,
    ...(hasOverFlow && {
      overflowDayStart,
      overflowTimeRunning,
      overflowMinutes,
    }),
  });

  return {
    result,
    nextTime: currentTime,
    nextDay: currentDay,
    ghepKho,
  };
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

  // Clone dates to avoid modifying the originals passed in
  let currentStart = new Date(start);
  let currentEnd = new Date(end);

  let totalOverlap = 0;

  for (const brk of breakTimes) {
    // Need to handle breaks spanning midnight if currentEnd crosses midnight
    // For simplicity here, assuming breaks are within a 24-hour cycle from start.
    // If a break crosses midnight, it needs more complex handling to ensure correct day context.

    // Create break start/end for the current day of 'start'
    let bStart = new Date(currentStart);
    let [bHour, bMinute] = brk.start.split(":").map(Number);
    bStart.setHours(bHour, bMinute, 0, 0);

    let bEnd = new Date(currentStart);
    let [beHour, beMinute] = brk.end.split(":").map(Number);
    bEnd.setHours(beHour, beMinute, 0, 0);

    // If a break period conceptually goes into the next day (e.g., 02:00-02:45 for a shift starting previous day)
    // and currentTime is also on the next day, we need to adjust bStart/bEnd.
    if (bEnd.getTime() < bStart.getTime()) {
      // Break crosses midnight
      bEnd.setDate(bEnd.getDate() + 1);
    }

    // Check for overlap between [currentStart, currentEnd] and [bStart, bEnd]
    if (currentEnd > bStart && currentStart < bEnd) {
      const overlapStart = currentStart < bStart ? bStart : currentStart;
      const overlapEnd = currentEnd > bEnd ? bEnd : currentEnd;
      totalOverlap += (overlapEnd - overlapStart) / 60000;
    }
  }

  return totalOverlap;
};

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
    const plannings = await Planning.findAll({
      where: { chooseMachine: machine },
      include: [
        {
          model: Order,
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Box, as: "box" },
          ],
        },
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
          console.log("⏸️ Pause order:", planning.orderId);

          const order = await Order.findOne({
            where: { orderId: planning.orderId },
          });
          if (order) {
            order.status = newStatus;
            await order.save();
          }

          // 2️⃣ Xoá planning hiện tại
          await planning.destroy();

          // 3️⃣ Xoá cả planning phụ thuộc (nếu có)
          const dependents = await Planning.findAll({
            where: {
              dependOnPlanningId: planning.planningId,
            },
          });

          for (const dependent of dependents) {
            console.log(
              `🗑️ Deleting dependent planningId: ${dependent.planningId}`
            );
            await dependent.destroy();
          }
        }
      }
    } else {
      // 2) Nếu là hoàn thành
      for (const planning of plannings) {
        planning.status = newStatus;
        await planning.save();

        // 3) Kiểm tra nếu là bước làm giấy và đơn có isBox
        const order = await Order.findOne({
          where: { orderId: planning.orderId },
        });

        if (order?.isBox && planning.step === "paper") {
          // 4) Tìm kế hoạch phụ thuộc (step: "box")
          const dependent = await Planning.findOne({
            where: {
              orderId: planning.orderId,
              step: "box",
              dependOnPlanningId: planning.planningId,
              status: "waiting",
            },
          });

          // 5) Nếu có, cập nhật thành planning
          if (dependent) {
            dependent.status = "planning";
            await dependent.save();
            console.log(
              `➡️ Updated dependent step 'box' to planning for order: ${order.orderId}`
            );
          }
        }
      }
    }

    // 6) Xóa cache
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
