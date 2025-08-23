import Redis from "ioredis";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import planningBoxMachineTime from "../../../models/planning/planningBoxMachineTime.js";
import MachineBox from "../../../models/admin/machineBox.js";
import WasteNormBox from "../../../models/admin/wasteNormBox.js";
import {
  getPlanningBoxByField,
  parseTimeOnly,
  formatTimeToHHMMSS,
  addMinutes,
  addDays,
  formatDate,
  getWorkShift,
  isDuringBreak,
  setTimeOnDay,
} from "../../../utils/helper/planningHelper.js";

const redisCache = new Redis();

//get all planning box
export const getPlanningBox = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res
      .status(400)
      .json({ message: "Missing 'machine' query parameter" });
  }

  try {
    const cacheKey = `planning:box:machine:${machine}`;

    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: `get filtered cached planning:box:machine:${machine}`,
        data: JSON.parse(cachedData),
      });
    }

    const planning = await getPlanningByMachineSorted(machine);

    await redisCache.set(cacheKey, JSON.stringify(planning), "EX", 1800);

    return res.status(200).json({
      message: `get planning by machine: ${machine}`,
      data: planning,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//sort planning
const getPlanningByMachineSorted = async (machine) => {
  const data = await PlanningBox.findAll({
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
        model: planningBoxMachineTime,
        where: { machine: machine },
        as: "boxTimes",
        attributes: { exclude: ["createdAt", "updatedAt"] },
      },
      {
        model: planningBoxMachineTime,
        as: "allBoxTimes",
        where: {
          machine: { [Op.ne]: machine },
        },
        attributes: {
          exclude: [
            "timeRunning",
            "dayStart",
            "dayCompleted",
            "wasteBox",
            "shiftManagement",
            "status",
            "sortPlanning",
            "createdAt",
            "updatedAt",
            "rpWasteLoss",
          ],
        },
      },
      {
        model: timeOverflowPlanning,
        as: "timeOverFlow",
        required: false,
        where: { machine: machine },
        attributes: { exclude: ["createdAt", "updatedAt"] },
      },
      {
        model: Order,
        attributes: [
          "orderId",
          "dayReceiveOrder",
          "flute",
          "QC_box",
          "numberChild",
          "dateRequestShipping",
          "customerId",
          "productId",
          "quantityCustomer",
        ],
        include: [
          {
            model: Customer,
            attributes: ["customerName", "companyName"],
          },
          {
            model: Box,
            as: "box",
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
      },
    ],
  });

  //lọc đơn complete trong 3 ngày
  const truncateToDate = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const now = truncateToDate(new Date());

  const validData = data.filter((planning) => {
    const boxTimes = planning.boxTimes || [];

    const hasValidStatus = boxTimes.some((bt) =>
      ["planning", "lackOfQty", "producing"].includes(bt.status)
    );

    const hasRecentComplete = boxTimes.some((bt) => {
      if (bt.status !== "complete" || !bt.dayCompleted) return false;

      const dayCompleted = new Date(bt.dayCompleted);
      if (isNaN(dayCompleted)) return false;

      const expiredDate = truncateToDate(dayCompleted);
      expiredDate.setDate(expiredDate.getDate() + 3);

      return expiredDate >= now;
    });

    return hasValidStatus || hasRecentComplete;
  });

  // 3. Phân loại withSort và noSort
  const withSort = validData.filter((item) =>
    item.boxTimes?.some((bt) => bt.sortPlanning !== null)
  );
  const noSort = validData.filter(
    (item) => !item.boxTimes?.some((bt) => bt.sortPlanning !== null)
  );

  // Sắp xếp withSort theo sortPlanning (dùng sortPlanning đầu tiên trong boxTimes)
  withSort.sort((a, b) => {
    const sortA =
      a.boxTimes?.find((bt) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
    const sortB =
      b.boxTimes?.find((bt) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
    return sortA - sortB;
  });

  // Sắp xếp noSort theo flute (ưu tiên sóng)
  noSort.sort((a, b) => {
    const wavePriorityMap = { C: 3, B: 2, E: 1 };

    const getWavePriorityList = (flute) => {
      if (!flute) return [];
      return flute
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .split("")
        .map((w) => wavePriorityMap[w] || 0);
    };

    const waveA = getWavePriorityList(a.Order?.flute);
    const waveB = getWavePriorityList(b.Order?.flute);

    for (let i = 0; i < Math.max(waveA.length, waveB.length); i++) {
      const priA = waveA[i] ?? 0;
      const priB = waveB[i] ?? 0;
      if (priB !== priA) return priB - priA;
    }

    return 0;
  });

  const sortedPlannings = [...withSort, ...noSort];

  // 4. Gộp đơn overflow nếu có
  const allPlannings = [];
  sortedPlannings.forEach((planning) => {
    const original = {
      ...planning.toJSON(),
      dayStart: planning.dayStart,
    };
    allPlannings.push(original);

    if (planning.timeOverFlow && planning.timeOverFlow.length > 0) {
      planning.timeOverFlow.forEach((of) => {
        const overflowPlanning = {
          ...original,
          boxTimes: (planning.boxTimes || []).map((bt) => ({
            ...bt.dataValues,
            dayStart: of.overflowDayStart,
            dayCompleted: of.overflowDayCompleted,
            timeRunning: of.overflowTimeRunning,
          })),
        };
        allPlannings.push(overflowPlanning);
      });
    }
  });

  return allPlannings;
};

//get by orderId
export const getPlanningBoxByOrderId = async (req, res) => {
  const { orderId, machine } = req.query;

  if (!machine || !orderId) {
    return res.status(400).json({ message: "Thiếu machine hoặc orderId" });
  }

  try {
    const cacheKey = `planning:box:machine:${machine}`;

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data planning from Redis");
      const parsedData = JSON.parse(cachedData);

      // Tìm kiếm tương đối trong cache
      const filteredData = parsedData.filter((item) => {
        return item.orderId?.toLowerCase().includes(orderId.toLowerCase());
      });

      return res.json({
        message: `Get planning by orderId from cache`,
        data: filteredData,
      });
    }

    const planning = await PlanningBox.findAll({
      where: {
        orderId: {
          [Op.like]: `%${orderId}%`,
        },
      },
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
export const getPlanningBoxByCusName = async (req, res) =>
  getPlanningBoxByField(req, res, "customerName");

//get by flute
export const getPlanningBoxByFlute = async (req, res) =>
  getPlanningBoxByField(req, res, "flute");

//get by ghepKho
export const getPlanningBoxByQcBox = async (req, res) =>
  getPlanningBoxByField(req, res, "QC_box");

export const acceptLackQtyBox = async (req, res) => {
  const { planningBoxIds, newStatus, machine } = req.body;

  if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
    return res.status(400).json({ message: "Missing or invalid planningIds" });
  }

  try {
    const plannings = await planningBoxMachineTime.findAll({
      where: {
        planningBoxId: {
          [Op.in]: planningBoxIds,
        },
        machine: machine,
      },
    });
    if (plannings.length === 0) {
      return res.status(404).json({ message: "No planning found" });
    }

    for (const planning of plannings) {
      if (planning.sortPlanning === null) {
        return res.status(400).json({
          message: "Cannot pause planning without sortPlanning",
        });
      }

      planning.status = newStatus;

      await planning.save();

      if (planning.hasOverFlow) {
        await timeOverflowPlanning.update(
          { status: newStatus },
          { where: { planningBoxId: planning.planningBoxId } }
        );
      }
    }

    // 6) Xóa cache
    await redisCache.del(`planning:box:machine:${machine}`);

    res.status(200).json({
      message: `Update status:${newStatus} successfully.`,
    });
  } catch (error) {
    console.log("error pause planning", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//update index planning
export const updateIndex_TimeRunningBox = async (req, res) => {
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } =
    req.body;
  if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
    return res.status(400).json({ message: "Missing or invalid updateIndex" });
  }

  const transaction = await PlanningBox.sequelize.transaction();
  const cachedKey = `planning:box:machine:${machine}`;

  try {
    await updateSortPlanning(machine, updateIndex, transaction);
    const sortedPlannings = await getSortedPlannings(
      machine,
      updateIndex.map((i) => i.planningBoxId),
      transaction
    );
    const machineInfo = await MachineBox.findOne({
      where: { machineName: machine },
      transaction,
    });
    if (!machineInfo) throw new Error("Machine not found");

    const updatedPlannings = await calculateTimeRunningPlannings({
      machine,
      machineInfo,
      dayStart,
      timeStart,
      totalTimeWorking,
      plannings: sortedPlannings,
      transaction,
    });

    await transaction.commit();
    await redisCache.del(cachedKey);

    req.io
      .to(`machine_${machine.toLowerCase().replace(/\s+/g, "_")}`)
      .emit("planningBoxUpdated", {
        machine,
        message: `Kế hoạch của ${machine} đã được cập nhật.`,
      });

    return res.status(200).json({
      message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
      data: updatedPlannings,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Update failed:", error);
    return res
      .status(500)
      .json({ message: "❌ Lỗi khi cập nhật", error: error.message });
  }
};

// Cập nhật sortPlanning
const updateSortPlanning = async (machine, updateIndex, transaction) => {
  for (const item of updateIndex) {
    const boxTime = await planningBoxMachineTime.findOne({
      where: { planningBoxId: item.planningBoxId, machine },
      transaction,
    });
    if (boxTime) {
      await boxTime.update(
        { sortPlanning: item.sortPlanning },
        { transaction }
      );
    } else {
      console.warn("❌ Không tìm thấy boxTime:", item);
    }
  }
};

// Lấy lại danh sách planning đã update
const getSortedPlannings = async (machine, planningBoxIds, transaction) => {
  return PlanningBox.findAll({
    where: { planningBoxId: planningBoxIds },
    include: [
      { model: timeOverflowPlanning, as: "timeOverFlow" },
      { model: planningBoxMachineTime, as: "boxTimes", where: { machine } },
      {
        model: Order,
        include: [
          { model: Customer, attributes: ["customerName", "companyName"] },
          { model: Box, as: "box" },
        ],
      },
    ],
    order: [
      [
        { model: planningBoxMachineTime, as: "boxTimes" },
        "sortPlanning",
        "ASC",
      ],
    ],
    transaction,
  });
};

// Tính thời gian cho danh sách planning
const calculateTimeRunningPlannings = async ({
  machine,
  machineInfo,
  dayStart,
  timeStart,
  totalTimeWorking,
  plannings,
  transaction,
}) => {
  // đảm bảo currentDay là Date và currentTime có ngày = dayStart
  let currentDay = new Date(dayStart);
  let currentTime = setTimeOnDay(currentDay, timeStart);

  const updated = [];

  for (const planning of plannings) {
    const data = await calculateTimeForOnePlanning({
      planning,
      machine,
      machineInfo,
      currentTime,
      currentDay,
      timeStart,
      totalTimeWorking,
      transaction,
    });
    currentTime = data.nextTime;
    currentDay = data.nextDay;
    updated.push(data.result);
  }
  return updated;
};

// Tính thời gian cho từng planning (sửa để ngày/giờ luôn đồng bộ)
const calculateTimeForOnePlanning = async ({
  planning,
  machine,
  machineInfo,
  currentTime,
  currentDay,
  timeStart,
  totalTimeWorking,
  transaction,
}) => {
  const { planningBoxId, sortPlanning, Order } = planning;
  const isMayIn = machine.toLowerCase().includes("máy in");

  // ✅ chỉ dùng quantityCustomer làm runningPlan
  const runningPlan = Order?.quantityCustomer || 0;

  console.log("\n==============================");
  console.log(`📦 Bắt đầu tính cho planningBoxId: ${planningBoxId}`);
  console.log(`🔹 Máy: ${machine}`);
  console.log(`🔹 runningPlan (Order.quantityCustomer): ${runningPlan}`);
  console.log(`🔹 Giờ bắt đầu: ${formatTimeToHHMMSS(currentTime)}`);

  const productionMinutes = calculateProductionMinutes({
    runningPlan,
    Order,
    machineInfo,
    isMayIn,
  });
  console.log(`⏱️ productionMinutes: ${productionMinutes} phút`);

  // --- logic giữ nguyên ---
  const { startOfWorkTime: rawStart, endOfWorkTime: rawEnd } = getWorkShift(
    currentDay,
    timeStart,
    totalTimeWorking
  );
  const startOfWorkTime = setTimeOnDay(currentDay, rawStart);
  const endOfWorkTime = setTimeOnDay(currentDay, rawEnd);
  currentTime = setTimeOnDay(currentDay, currentTime);

  if (currentTime < startOfWorkTime) {
    currentTime = setTimeOnDay(currentDay, startOfWorkTime);
  }

  if (currentTime >= endOfWorkTime) {
    const nextDay = addDays(currentDay, 1);
    const nextStart = setTimeOnDay(nextDay, timeStart);
    return await calculateTimeForOnePlanning({
      planning,
      machine,
      machineInfo,
      currentTime: nextStart,
      currentDay: nextDay,
      timeStart,
      totalTimeWorking,
      transaction,
    });
  }

  let result = {
    planningBoxId,
    dayStart: currentDay.toISOString().split("T")[0],
  };
  let hasOverFlow = false;

  const tempEndTime = addMinutes(currentTime, productionMinutes);
  const extraBreak = isDuringBreak(currentTime, tempEndTime);
  const predictedEndTime = addMinutes(
    currentTime,
    productionMinutes + extraBreak
  );

  if (predictedEndTime > endOfWorkTime) {
    hasOverFlow = true;
    result.timeRunning = formatTimeToHHMMSS(endOfWorkTime);

    const overflowData = await handleOverflow({
      planningBoxId,
      sortPlanning,
      predictedEndTime,
      endOfWorkTime,
      timeStart,
      currentDay,
      machine,
      transaction,
    });

    Object.assign(result, overflowData);

    currentDay = new Date(overflowData.overflowDayStart);
    currentTime = setTimeOnDay(currentDay, overflowData.overflowTimeRunning);
  } else {
    result.timeRunning = formatTimeToHHMMSS(predictedEndTime);
    currentTime = predictedEndTime;

    await timeOverflowPlanning.destroy({
      where: { planningBoxId, machine },
      transaction,
    });
  }

  // ✅ update hasOverFlow theo quantityCustomer
  await PlanningBox.update(
    { hasOverFlow: hasOverFlow && runningPlan > 0 },
    { where: { planningBoxId }, transaction }
  );

  // tính waste
  const wasteBoxValue = await calculateWasteBoxValue({
    machine,
    runningPlan,
    Order,
    isMayIn,
    transaction,
  });
  if (wasteBoxValue !== null) {
    result.wasteBox = Math.round(wasteBoxValue);
  }

  await planningBoxMachineTime.update(
    { ...result, sortPlanning },
    { where: { planningBoxId, machine }, transaction }
  );

  return { result, nextTime: currentTime, nextDay: currentDay };
};

// Tính phút sản xuất (có log)
const calculateProductionMinutes = ({
  runningPlan,
  Order,
  machineInfo,
  isMayIn,
}) => {
  if (runningPlan <= 0) return 0;
  const numberChild = Order?.numberChild || 1;
  const totalLength = runningPlan / numberChild;
  const speed = totalLength / (machineInfo.speedOfMachine / 60);

  console.log(`📏 numberChild: ${numberChild}`);
  console.log(`🚀 speed tính theo phút: ${speed}`);

  if (isMayIn && Order?.box?.dataValues) {
    const { inMatTruoc = 0, inMatSau = 0 } = Order.box.dataValues;
    console.log(`🎨 inMatTruoc: ${inMatTruoc}, inMatSau: ${inMatSau}`);
    return Math.ceil(
      machineInfo.timeToProduct * (inMatTruoc + inMatSau) + speed
    );
  }
  return Math.ceil(machineInfo.timeToProduct + speed);
};

// Xử lý overflow
const handleOverflow = async ({
  planningBoxId,
  sortPlanning,
  predictedEndTime,
  endOfWorkTime,
  timeStart,
  currentDay,
  machine,
  transaction,
}) => {
  const overflowMinutes = (predictedEndTime - endOfWorkTime) / 60000;
  const overflowDayStart = formatDate(addDays(currentDay, 1));
  const overflowTimeRunning = formatTimeToHHMMSS(
    addMinutes(parseTimeOnly(timeStart), overflowMinutes)
  );

  await timeOverflowPlanning.destroy({
    where: { planningBoxId, machine },
    transaction,
  });

  await timeOverflowPlanning.create(
    {
      planningBoxId,
      machine,
      overflowDayStart,
      overflowTimeRunning,
      sortPlanning,
    },
    { transaction }
  );

  return {
    overflowDayStart,
    overflowTimeRunning,
    overflowMinutes: `${Math.round(overflowMinutes)} phút`,
  };
};

// Tính waste
const calculateWasteBoxValue = async ({
  machine,
  runningPlan,
  Order,
  isMayIn,
  transaction,
}) => {
  if (runningPlan <= 0) return null;
  const wasteNorm = await WasteNormBox.findOne({
    where: { machineName: machine },
    transaction,
  });
  if (!wasteNorm) return null;

  const {
    colorNumberOnProduct = 0,
    paperNumberOnProduct = 0,
    totalLossOnTotalQty = 0,
  } = wasteNorm;
  if (isMayIn && Order?.box?.dataValues) {
    const { inMatTruoc = 0, inMatSau = 0 } = Order.box.dataValues;
    return (
      colorNumberOnProduct * inMatTruoc +
      colorNumberOnProduct * inMatSau +
      runningPlan * (totalLossOnTotalQty / 100)
    );
  }
  return paperNumberOnProduct + runningPlan * (totalLossOnTotalQty / 100);
};
