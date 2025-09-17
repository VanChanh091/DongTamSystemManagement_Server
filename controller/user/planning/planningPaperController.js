import Redis from "ioredis";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Box from "../../../models/order/box.js";
import PlanningPaper from "../../../models/planning/planningPaper.js";
import { deleteKeysByPattern } from "../../../utils/helper/adminHelper.js";
import { getPlanningPaperByField } from "../../../utils/helper/planningHelper.js";
import MachinePaper from "../../../models/admin/machinePaper.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import WasteNormPaper from "../../../models/admin/wasteNormPaper.js";
import WaveCrestCoefficient from "../../../models/admin/waveCrestCoefficient.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import planningBoxMachineTime from "../../../models/planning/planningBoxMachineTime.js";

const redisCache = new Redis();

//===============================PLANNING ORDER=====================================

//getOrderAccept
export const getOrderAccept = async (req, res) => {
  const { refresh = false } = req.query;
  try {
    const cacheKey = "orders:userId:status:accept";

    if (refresh == "true") {
      await redisCache.del(cacheKey);
    }

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
    const wasteNorm = await WasteNormPaper.findOne({
      where: { machineName: chooseMachine },
    });
    const waveCoeff = await WaveCrestCoefficient.findOne({
      where: { machineName: chooseMachine },
    });

    if (!wasteNorm || !waveCoeff) {
      throw new Error(`WasteNorm or WaveCrestCoefficient not found for machine: ${chooseMachine}`);
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
    const waveTypes = (order.flute.match(/[EBC]/gi) || []).map((s) => s.toUpperCase());
    const roundSmart = (num) => Math.round(num * 100) / 100;

    // 5) Hàm tính phế liệu paper
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
          const linerBefore = prev && prev.kind === "liner" ? prev.thickness / 1000 : 0;

          let coef = 0;
          if (letter === "E") {
            coef = countE === 0 ? waveCoeff.fluteE_1 : waveCoeff.fluteE_2;
            countE++;
          } else {
            coef = waveCoeff[`flute${letter}`] || 0;
          }

          const loss =
            gkTh * wasteNorm.waveCrest * linerBefore + gkTh * wasteNorm.waveCrest * fluteTh * coef;

          flute[letter] += loss;
        }
      }

      // 5.1) Lớp liner cuối cùng
      const lastLiner = [...layers].reverse().find((l) => l.kind === "liner");
      if (lastLiner) {
        softLiner = gkTh * wasteNorm.waveCrestSoft * (lastLiner.thickness / 1000);
      }

      // 5.2) Tính hao phí, dao, tổng hao hụt
      let knife = 0;
      let haoPhi = 0;

      const bottom = flute.E + flute.B + flute.C + softLiner;
      if (wasteNorm.waveCrestSoft > 0) {
        haoPhi =
          (runningPlan / numberChild) *
          (bottom / wasteNorm.waveCrestSoft) *
          (wasteNorm.lossInProcess / 100);
      }
      if (wasteNorm.waveCrestSoft > 0) {
        knife = (bottom / wasteNorm.waveCrestSoft) * wasteNorm.lossInSheetingAndSlitting;
      }
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

    // 6) Tạo kế hoạch làm giấy tấm
    const paperPlan = await PlanningPaper.create({
      orderId,
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
    const box = order.box;
    if (order.isBox) {
      boxPlan = await PlanningBox.create({
        planningId: paperPlan.planningId,
        orderId,

        day: paperPlan.dayReplace,
        matE: paperPlan.matEReplace,
        matB: paperPlan.matBReplace,
        matC: paperPlan.matCReplace,
        songE: paperPlan.songEReplace,
        songB: paperPlan.songBReplace,
        songC: paperPlan.songCReplace,
        songE2: paperPlan.songE2Replace,
        length: paperPlan.lengthPaperPlanning,
        size: paperPlan.sizePaperPLaning,

        hasIn: !!(box.inMatTruoc || box.inMatSau),
        hasCanLan: !!box.canLan,
        hasBe: !!box.be,
        hasXa: !!box.Xa,
        hasDan: !!(box.dan_1_Manh || box.dan_2_Manh),
        hasCatKhe: !!box.catKhe,
        hasCanMang: !!box.canMang,
        hasDongGhim: !!(box.dongGhim1Manh || box.dongGhim2Manh),
      });
    }

    //9) dựa vào các hasIn, hasBe, hasXa... để tạo ra planning box time
    if (boxPlan) {
      const machineTimes = [];

      const machineMap = {
        hasIn: "Máy In",
        hasCanLan: "Máy Cấn Lằn",
        hasBe: "Máy Bế",
        hasXa: "Máy Xả",
        hasDan: "Máy Dán",
        hasCatKhe: "Máy Cắt Khe",
        hasCanMang: "Máy Cán Màng",
        hasDongGhim: "Máy Đóng Ghim",
      };

      for (const [flag, machineName] of Object.entries(machineMap)) {
        const isMachineUsed = boxPlan[flag] === true;

        if (isMachineUsed) {
          machineTimes.push({
            planningBoxId: boxPlan.planningBoxId,
            machine: machineName,
          });
        }
      }

      if (machineTimes.length > 0) {
        await planningBoxMachineTime.bulkCreate(machineTimes);
      }
    }

    // 10) Cập nhật trạng thái đơn hàng
    order.status = newStatus;
    await order.save();

    // 11) Xoá cache
    await redisCache.del(`planning:machine:${chooseMachine}`);
    await deleteKeysByPattern(redisCache, `orders:userId:status:accept_planning:*`);

    // 12) Trả kết quả
    return res.status(201).json({
      message: "Đã tạo kế hoạch thành công.",
      planning: [paperPlan, boxPlan].filter(Boolean),
    });
  } catch (error) {
    console.error("planningOrder error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

//===============================PRODUCTION QUEUE=====================================

//get planning by machine
export const getPlanningByMachine = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res.status(400).json({ message: "Missing 'machine' query parameter" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;

    //refresh cache
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: `get all cache planning:machine:${machine}`,
        data: JSON.parse(cachedData),
      });
    }

    const data = await getPlanningByMachineSorted(machine);

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    res.status(200).json({
      message: `get planning by machine: ${machine}`,
      data,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//sort planning
const getPlanningByMachineSorted = async (machine) => {
  try {
    const data = await PlanningPaper.findAll({
      where: { chooseMachine: machine },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        },
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
              "vat",
              "rejectReason",
              "createdAt",
              "updatedAt",
              "lengthPaperCustomer",
              "paperSizeCustomer",
              "quantityCustomer",
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
    });

    //lọc đơn complete trong 3 ngày
    const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const now = truncateToDate(new Date());

    const validData = data.filter((planning) => {
      if (["planning", "lackQty", "producing"].includes(planning.status)) return true;

      if (planning.status === "complete") {
        const dayCompleted = new Date(planning.dayCompleted);
        if (isNaN(dayCompleted)) return false;

        const expiredDate = truncateToDate(new Date(dayCompleted));
        expiredDate.setDate(expiredDate.getDate() + 3);

        return expiredDate >= now;
      }

      return false;
    });

    const withSort = validData.filter((item) => item.sortPlanning !== null);
    const noSort = validData.filter((item) => item.sortPlanning === null);

    // Sắp xếp đơn có sortPlanning theo thứ tự được lưu
    withSort.sort((a, b) => a.sortPlanning - b.sortPlanning);

    // Sắp xếp đơn chưa có sortPlanning theo logic yêu cầu
    noSort.sort((a, b) => {
      const wavePriorityMap = { C: 3, B: 2, E: 1 };

      //5BC -> 5
      const getLayer = (flute) => {
        if (!flute || flute.length < 1) return 0;
        return parseInt(flute.trim()[0]) || 0;
      };

      //5BC -> BC [2,3]
      const getWavePriorityList = (flute) => {
        if (!flute || flute.length < 2) return [];
        const waves = flute.trim().slice(1).toUpperCase().split("");
        return waves.map((w) => wavePriorityMap[w] || 0);
      };

      //compare
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

    //Gộp overflow vào liền sau đơn gốc
    const allPlannings = [];
    sortedPlannings.forEach((planning) => {
      const original = {
        ...planning.toJSON(),
        timeRunning: planning.timeRunning,
        dayStart: planning.dayStart,
      };
      allPlannings.push(original);

      if (planning.timeOverFlow) {
        const overflowDayStart = planning.timeOverFlow.overflowDayStart;
        const overflowTime = planning.timeOverFlow.overflowTimeRunning;
        const dayCompletedOverflow = planning.timeOverFlow.overflowDayCompleted;

        allPlannings.push({
          ...original,
          dayStart: overflowDayStart,
          dayCompleted: dayCompletedOverflow,
          timeRunning: overflowTime,
        });
      }
    });

    return allPlannings;
  } catch (error) {
    console.error("Error fetching planning by machine:", error);
    throw error;
  }
};

//change planning machine
export const changeMachinePlanning = async (req, res) => {
  const { planningIds, newMachine } = req.body;
  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      return res.status(400).json({ message: "Missing or invalid planningIds" });
    }

    const plannings = await PlanningPaper.findAll({
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

    const planning = await PlanningPaper.findAll({
      where: {
        orderId: {
          [Op.like]: `%${orderId}%`,
        },
      },
      include: [
        {
          model: Order,
          attributes: {
            exclude: [
              "dayReceiveOrder",
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
  getPlanningPaperByField(req, res, "customerName");

//get by flute
export const getPlanningByFlute = async (req, res) => getPlanningPaperByField(req, res, "flute");

//get by ghepKho
export const getPlanningByGhepKho = async (req, res) =>
  getPlanningPaperByField(req, res, "ghepKho");

//pause planning
export const pauseOrAcceptLackQtyPLanning = async (req, res) => {
  const { planningIds, newStatus } = req.body;
  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      return res.status(400).json({ message: "Missing or invalid planningIds" });
    }

    const plannings = await PlanningPaper.findAll({
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
          const order = await Order.findOne({
            where: { orderId: planning.orderId },
          });
          if (order) {
            order.status = newStatus;
            await order.save();
          }

          // Xoá dữ liệu phụ thuộc bằng tay
          const dependents = await PlanningBox.findAll({
            where: { planningId: planning.planningId },
          });

          for (const box of dependents) {
            await planningBoxMachineTime.destroy({
              where: { planningBoxId: box.planningBoxId },
            });
            await box.destroy();
          }

          await planning.destroy();
        }
      }
    } else {
      // 2) Nếu là hoàn thành
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
            { where: { planningId: planning.planningId } }
          );
        }

        const planningBox = await PlanningBox.findOne({
          where: { planningId: planning.planningId },
        });
        if (!planningBox) {
          continue;
        }

        await planningBox.update({
          runningPlan: planning.qtyProduced,
        });
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

//update index & time running
export const updateIndex_TimeRunning = async (req, res) => {
  const { machine } = req.query;
  const { updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;

  if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
    return res.status(400).json({ message: "Missing or invalid updateIndex" });
  }

  const transaction = await PlanningPaper.sequelize.transaction();
  const cachedKey = `planning:machine:${machine}`;

  try {
    // 1. Cập nhật sortPlanning
    for (const item of updateIndex) {
      if (!item.sortPlanning) continue;

      const planningPaper = await PlanningPaper.findOne({
        where: {
          planningId: item.planningId,
          status: { [Op.ne]: "complete" }, //không cập nhật đơn đã complete
        },
      });

      if (planningPaper) {
        await planningPaper.update({ sortPlanning: item.sortPlanning }, { transaction });
      }
    }

    // 2. Lấy lại danh sách planning đã được update
    const sortedPlannings = await PlanningPaper.findAll({
      where: { planningId: updateIndex.map((i) => i.planningId) },
      include: [{ model: Order }, { model: timeOverflowPlanning, as: "timeOverFlow" }],
      order: [["sortPlanning", "ASC"]],
      transaction,
    });

    // 3. Tính toán thời gian chạy cho từng planning
    const machineInfo = await MachinePaper.findOne({
      where: { machineName: machine },
      transaction,
    });
    if (!machineInfo) throw new Error("Machine not found");

    const updatedPlannings = await calculateTimeRunningPlannings({
      plannings: sortedPlannings,
      machineInfo: machineInfo,
      machine,
      dayStart,
      timeStart,
      totalTimeWorking,
      transaction,
    });

    await transaction.commit();
    await redisCache.del(cachedKey);

    //socket
    const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
    req.io.to(roomName).emit("planningPaperUpdated", {
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
    return res.status(500).json({
      message: "❌ Lỗi khi cập nhật và tính toán thời gian",
      error: error.message,
    });
  }
};

const calculateTimeRunningPlannings = async ({
  plannings,
  machineInfo,
  machine,
  dayStart,
  timeStart,
  totalTimeWorking,
  transaction,
}) => {
  const updated = [];
  let currentTime, currentDay, lastGhepKho;

  // ✅ Ưu tiên lấy đơn complete từ FE gửi xuống
  const feComplete = plannings
    .filter((p) => p.status === "complete")
    .sort((a, b) => new Date(b.dayStart) - new Date(a.dayStart))[0];

  if (feComplete) {
    if (feComplete.hasOverFlow) {
      const overflowRecord = await timeOverflowPlanning.findOne({
        where: { planningId: feComplete.planningId },
        transaction,
      });

      if (overflowRecord && overflowRecord.overflowTimeRunning && overflowRecord.overflowDayStart) {
        // Sử dụng overflow day + time làm con trỏ
        currentDay = new Date(overflowRecord.overflowDayStart);
        currentTime = combineDateAndHHMMSS(currentDay, overflowRecord.overflowTimeRunning);
        lastGhepKho = feComplete.ghepKho ?? null;
      } else if (feComplete.dayStart && feComplete.timeRunning) {
        // fallback: nếu không tìm thấy record overflow trong DB, dùng dayStart/timeRunning từ FE
        currentDay = new Date(feComplete.dayStart);
        currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
        lastGhepKho = feComplete.ghepKho ?? null;
      } else {
        // fallback cuối cùng: dùng logic cũ lấy cursor từ DB
        const initCursor = await getInitialCursor({
          machine,
          dayStart,
          timeStart,
          transaction,
        });
        currentTime = initCursor.currentTime;
        currentDay = initCursor.currentDay;
        lastGhepKho = initCursor.lastGhepKho;
      }
    } else {
      // Không có overflow → dùng dayStart + timeRunning từ FE
      currentDay = new Date(feComplete.dayStart);
      currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
      lastGhepKho = feComplete.ghepKho ?? null;
    }
  } else {
    const initCursor = await getInitialCursor({
      machine,
      dayStart,
      timeStart,
      transaction,
    });
    currentTime = initCursor.currentTime;
    currentDay = initCursor.currentDay;
    lastGhepKho = initCursor.lastGhepKho;
  }

  // ✅ Bỏ qua các đơn complete trong vòng lặp (chỉ tính planning)
  for (let i = 0; i < plannings.length; i++) {
    const planning = plannings[i];
    if (planning.status === "complete") continue;

    const data = await calculateTimeForOnePlanning({
      planning,
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

  const isSameSize = lastGhepKho != null && ghepKho === lastGhepKho;

  const changeTime =
    machine === "Máy Quấn Cuồn"
      ? machineInfo.timeChangeSize
      : isFirst
      ? machineInfo.timeChangeSize
      : isSameSize
      ? machineInfo.timeChangeSameSize
      : machineInfo.timeChangeSize;

  //công thức
  const productionMinutes = Math.ceil((changeTime + totalLength / speed) / (performance / 100));

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
  predictedEndTime.setMinutes(predictedEndTime.getMinutes() + productionMinutes + extraBreak);

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
    actualOverflowEndTime.setMinutes(actualOverflowEndTime.getMinutes() + totalOverflowMinutes);

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

  if (planning.status !== "complete") {
    await PlanningPaper.update(
      {
        dayStart: currentPlanningDayStart,
        timeRunning: timeRunningForPlanning,
        hasOverFlow,
      },
      { where: { planningId }, transaction }
    );
  }

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

  // if (planning.status !== "complete") {
  //   console.log("🔍 [Tính toán đơn hàng]:", {
  //     planningId,
  //     status: planning.status,
  //     lastGhepKho,
  //     isSameSize,
  //     changeTime: `${changeTime} phút`,
  //     productionTime: `${productionMinutes} phút`,
  //     breakTime: `${extraBreak} phút`,
  //     predictedEndTime: formatTimeToHHMMSS(predictedEndTime),
  //     endOfWorkTime: formatTimeToHHMMSS(endOfWorkTime),
  //     hasOverFlow,
  //     overflowDayStart: hasOverFlow ? overflowDayStart : null,
  //     overflowTimeRunning: hasOverFlow ? overflowTimeRunning : null,
  //     overflowMinutes: hasOverFlow ? overflowMinutes : null,
  //     timeRunningForPlanning,
  //   });
  // }

  return { result, nextTime: currentTime, nextDay: currentDay, ghepKho };
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
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getSpeed = (flute, machineName, machineInfo) => {
  const numberLayer = parseInt(flute[0]);
  if (machineName === "Máy 2 Lớp") return machineInfo.speed2Layer;
  if (machineName === "Máy Quấn Cuồn") return machineInfo.paperRollSpeed;
  const speed = machineInfo[`speed${numberLayer}Layer`];
  if (!speed) {
    throw new Error(`❌ Không tìm thấy tốc độ cho flute=${flute}, machine=${machineName}`);
  }
  return speed;
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

const combineDateAndHHMMSS = (dateObj, hhmmss) => {
  const [h, m, s = 0] = hhmmss.split(":").map(Number);
  const d = new Date(dateObj);
  d.setHours(h, m, s || 0, 0);
  return d;
};

const getInitialCursor = async ({ machine, dayStart, timeStart, transaction }) => {
  const day = new Date(dayStart);
  const dayStr = day.toISOString().split("T")[0];

  // 1) base = dayStart + timeStart
  let base = parseTimeOnly(timeStart);
  base.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());

  let currentTime = base;
  let currentDay = new Date(day);
  let lastGhepKho = null;

  // -----------------------------
  // A) Lấy đơn complete trong cùng ngày
  const lastComplete = await PlanningPaper.findOne({
    where: { chooseMachine: machine, status: "complete", dayStart: dayStr },
    order: [["timeRunning", "DESC"]],
    attributes: ["timeRunning", "ghepKho"],
    transaction,
  });

  if (lastComplete?.timeRunning) {
    const t = combineDateAndHHMMSS(currentDay, lastComplete.timeRunning);
    if (t > currentTime) {
      currentTime = t;
      lastGhepKho = lastComplete.ghepKho ?? lastGhepKho;
    }
  }

  // -----------------------------
  // B) Lấy overflow từ hôm trước hoặc hôm nay
  const lastOverflow = await timeOverflowPlanning.findOne({
    include: [
      {
        model: PlanningPaper,
        attributes: ["status", "ghepKho", "chooseMachine"],
        where: { chooseMachine: machine, status: "complete" },
        required: true,
      },
    ],
    order: [
      ["overflowDayStart", "DESC"],
      ["overflowTimeRunning", "DESC"],
    ],
    transaction,
  });

  if (lastOverflow?.overflowTimeRunning) {
    const overflowDay = new Date(lastOverflow.overflowDayStart);
    const time = combineDateAndHHMMSS(overflowDay, lastOverflow.overflowTimeRunning);
    if (time > currentTime) {
      currentTime = time;
      lastGhepKho = lastOverflow.planning?.ghepKho ?? lastGhepKho;
    }
  }

  return { currentTime, currentDay, lastGhepKho };
};
