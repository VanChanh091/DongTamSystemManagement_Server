import Redis from "ioredis";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import planningBoxMachineTime from "../../../models/planning/planningBoxMachineTime.js";
import MachineBox from "../../../models/admin/machineBox.js";

const redisCache = new Redis();

//get all planning box
export const getPlanningBox = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res
      .status(400)
      .json({ message: "Missing 'machine' query parameter" });
  }

  const machineMap = {
    "máy in": "hasIn",
    "máy bế": "hasBe",
    "máy xả": "hasXa",
    "máy dán": "hasDan",
    "máy cắt khe": "hasCatKhe",
    "máy cán màng": "hasCanMang",
    "máy đóng ghim": "hasDongGhim",
  };

  const machineKey = machine.toLowerCase();
  const flagField = machineMap[machineKey];

  if (!flagField) {
    return res.status(400).json({ message: "Invalid machine" });
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

    const planning = await getPlanningByMachineSorted(machine, flagField);

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
const getPlanningByMachineSorted = async (machine, flagField) => {
  const truncateToDate = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const now = truncateToDate(new Date());

  // 1. Truy vấn tất cả đơn hàng theo máy và flag
  const data = await PlanningBox.findAll({
    where: {
      [flagField]: true,
    },
    attributes: {
      exclude: [
        "hasIn",
        "hasBe",
        "hasXa",
        "hasDan",
        "hasCatKhe",
        "hasCanMang",
        "hasDongGhim",
        "createdAt",
        "updatedAt",
      ],
    },
    include: [
      { model: timeOverflowPlanning, as: "timeOverFlow" },
      {
        model: planningBoxMachineTime,
        where: { machine, status: ["planning", "lackQty", "complete"] },
        as: "boxTimes",
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

  // 2. Lọc đơn có trạng thái hợp lệ
  const validData = data.filter((planning) => {
    const boxTimes = planning.boxTimes || [];

    const hasValidStatus = boxTimes.some((bt) =>
      ["planning", "lackQty", "waiting"].includes(bt.status)
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
      hasOverflow: false,
      dayStart: planning.dayStart,
    };
    allPlannings.push(original);

    if (planning.timeOverFlow) {
      allPlannings.push({
        ...original,
        hasOverflow: true,
        dayStart: planning.timeOverFlow.overflowDayStart,
        timeRunning: planning.timeOverFlow.overflowTimeRunning,
      });
    }
  });

  return allPlannings;
};

//get by orderId
// export const getPlanningByOrderId = async (req, res) => {
//   const { orderId, machine } = req.query;

//   if (!machine || !orderId) {
//     return res.status(400).json({ message: "Thiếu machine hoặc orderId" });
//   }

//   try {
//     const cacheKey = `planning:machine:${machine}`;

//     const cachedData = await redisCache.get(cacheKey);
//     if (cachedData) {
//       console.log("✅ Data planning from Redis");
//       const parsedData = JSON.parse(cachedData);

//       // Tìm kiếm tương đối trong cache
//       const filteredData = parsedData.filter((item) =>
//         item.orderId.toLowerCase().includes(orderId.toLowerCase())
//       );

//       return res.json({
//         message: `Get planning by orderId from cache`,
//         data: filteredData,
//       });
//     }

//     const planning = await Planning.findAll({
//       where: {
//         orderId: {
//           [Op.like]: `%${orderId}%`,
//         },
//       },
//       include: [
//         {
//           model: Order,
//           attributes: {
//             exclude: [
//               "dayReceiveOrder",
//               "acreage",
//               "dvt",
//               "price",
//               "pricePaper",
//               "discount",
//               "profit",
//               "totalPrice",
//               "vat",
//               "rejectReason",
//               "createdAt",
//               "updatedAt",
//             ],
//           },
//           include: [
//             {
//               model: Customer,
//               attributes: ["customerName", "companyName"],
//             },
//             {
//               model: Box,
//               as: "box",
//               attributes: {
//                 exclude: ["createdAt", "updatedAt"],
//               },
//             },
//           ],
//         },
//       ],
//     });

//     if (!planning || planning.length === 0) {
//       return res.status(404).json({
//         message: `Không tìm thấy kế hoạch với orderId chứa: ${orderId}`,
//       });
//     }

//     return res.status(200).json({
//       message: "Get planning by orderId from db",
//       data: planning,
//     });
//   } catch (error) {
//     console.error("❌ Lỗi khi tìm orderId:", error.message);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// //get by customer name
// export const getPlanningByCustomerName = async (req, res) =>
//   getPlanningByField(req, res, "customerName");

// //get by flute
// export const getPlanningByFlute = async (req, res) =>
//   getPlanningByField(req, res, "flute");

//pause planning

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

    if (newStatus == "complete") {
      for (const planning of plannings) {
        planning.status = newStatus;
        planning.sortPlanning = null;

        await planning.save();

        if (planning.hasOverFlow) {
          await timeOverflowPlanning.update(
            { status: newStatus, sortPlanning: null },
            { where: { planningBoxId: planning.planningBoxId } }
          );
        }
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
    // 1. Cập nhật sortPlanning
    for (const item of updateIndex) {
      const boxTime = await planningBoxMachineTime.findOne({
        where: {
          planningBoxId: item.planningBoxId,
          machine: machine,
        },
      });

      if (boxTime) {
        await boxTime.update({ sortPlanning: item.sortPlanning });
      } else {
        console.warn("❌ Không tìm thấy boxTime với:", {
          planningBoxId: item.planningBoxId,
          machine: machine,
        });
      }
    }

    // 2. Lấy lại danh sách planning đã được update
    const sortedPlannings = await PlanningBox.findAll({
      where: { planningBoxId: updateIndex.map((i) => i.planningBoxId) },
      attributes: {
        exclude: [
          "hasIn",
          "hasBe",
          "hasXa",
          "hasDan",
          "hasCatKhe",
          "hasCanMang",
          "hasDongGhim",
          "createdAt",
          "updatedAt",
        ],
      },
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
        {
          model: planningBoxMachineTime,
          where: { machine },
          as: "boxTimes",
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
      order: [
        [
          { model: planningBoxMachineTime, as: "boxTimes" },
          "sortPlanning",
          "ASC",
        ],
      ],
      transaction,
    });

    // 3. Tính toán thời gian chạy cho từng planning
    const machineInfo = await MachineBox.findOne({
      where: { machineName: machine },
      transaction,
    });
    if (!machineInfo) throw new Error("Machine not found");

    const updatedPlannings = await calculateTimeRunningPlannings({
      machine,
      machineInfo: machineInfo,
      dayStart,
      timeStart,
      totalTimeWorking,
      plannings: sortedPlannings, //danh sách planning
      transaction,
    });

    await transaction.commit();
    await redisCache.del(cachedKey);

    //socket
    const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
    req.io.to(roomName).emit("planningUpdated", {
      machine,
      message: `Kế hoạch của ${machine} đã được cập nhật.`,
    }); //

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
      transaction,
    });

    currentTime = data.nextTime;
    currentDay = data.nextDay;

    updated.push(data.result);
  }

  return updated;
};

//calculate time running
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
  const { planningBoxId, runningPlan, sortPlanning, Order } = planning;
  const numberChild = Order?.numberChild || 1;
  const totalLength = runningPlan / numberChild;

  const { timeToProduct, speedOfMachine } = machineInfo;
  let productionMinutes;
  const speed = totalLength / (speedOfMachine / 60);

  const isMayIn = machine.toLowerCase().includes("máy in");

  // ✅ Tính thời gian chạy nếu là máy in
  if (isMayIn && Order?.box?.dataValues) {
    const { inMatTruoc = 0, inMatSau = 0 } = Order.box.dataValues;
    const timeIn = timeToProduct * (inMatTruoc + inMatSau);
    productionMinutes = Math.ceil(timeIn + speed);
  } else {
    productionMinutes = Math.ceil(timeToProduct + speed);
  }

  // ✅ Xác định thời gian bắt đầu và kết thúc ca làm việc trong ngày
  let startOfWorkTime = new Date(currentDay);
  const [h, m] = timeStart.split(":").map(Number);
  startOfWorkTime.setHours(h, m, 0, 0);

  let endOfWorkTime = new Date(startOfWorkTime);
  endOfWorkTime.setHours(startOfWorkTime.getHours() + totalTimeWorking);

  if (currentTime < startOfWorkTime) {
    currentTime = new Date(startOfWorkTime);
  }

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

    await timeOverflowPlanning.destroy({
      where: { planningBoxId },
      transaction,
    });
    await timeOverflowPlanning.create(
      {
        planningBoxId,
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
    await timeOverflowPlanning.destroy({
      where: { planningBoxId },
      transaction,
    });
  }

  await PlanningBox.update(
    {
      dayStart: currentPlanningDayStart,
      hasOverFlow,
    },
    { where: { planningBoxId }, transaction }
  );

  // ✅ Update planningBoxMachineTime
  const existingBoxTime = await planningBoxMachineTime.findOne({
    where: {
      planningBoxId: planningBoxId,
      machine,
    },
    transaction,
  });

  //add sort planning here
  if (existingBoxTime) {
    await existingBoxTime.update(
      { timeRunning: timeRunningForPlanning, sortPlanning },
      { transaction }
    );
  }

  // ✅ LOG chuẩn, rõ ràng
  const logData = {
    planningBoxId: planningBoxId,
    timeStart,
    // box: Order?.box?.dataValues,
    totalTimeWorking,
    timeToProduct: `${timeToProduct} phút`,
    speed: `${speed} phút`,
    productionTime: `${productionMinutes} phút`,
    breakTime: `${extraBreak} phút`,
    predictedEndTime: formatTimeToHHMMSS(predictedEndTime),
    endOfWorkTime: formatTimeToHHMMSS(endOfWorkTime),
    hasOverFlow,
  };

  if (hasOverFlow) {
    Object.assign(logData, {
      overflowDayStart,
      overflowTimeRunning,
      overflowMinutes,
    });
  }

  console.log("🔍 Chi tiết tính toán đơn hàng:", logData);

  //log result
  return {
    result: {
      planningBoxId: planningBoxId,
      dayStart: currentPlanningDayStart,
      timeRunning: timeRunningForPlanning,
      ...(hasOverFlow && {
        overflowDayStart,
        overflowTimeRunning,
        overflowMinutes,
      }),
    },
    nextTime: currentTime,
    nextDay: currentDay,
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

const isDuringBreak = (start, end) => {
  const breakTimes = [
    { start: "11:30", end: "12:00", duration: 30 },
    { start: "17:00", end: "17:30", duration: 30 },
    { start: "02:00", end: "02:45", duration: 45 },
  ];

  let totalBreak = 0;

  for (const brk of breakTimes) {
    const [bStartHour, bStartMin] = brk.start.split(":").map(Number);
    const [bEndHour, bEndMin] = brk.end.split(":").map(Number);

    let bStart = new Date(start);
    let bEnd = new Date(start);

    bStart.setHours(bStartHour, bStartMin, 0, 0);
    bEnd.setHours(bEndHour, bEndMin, 0, 0);

    // Nếu giờ nghỉ qua đêm (VD: 02:00 – 02:45)
    if (bEnd <= bStart) {
      bEnd.setDate(bEnd.getDate() + 1);
    }

    // Nếu đơn hàng chạm vào break → cộng full thời lượng
    if (end > bStart && start < bEnd) {
      totalBreak += brk.duration;
    }
  }

  return totalBreak;
};
