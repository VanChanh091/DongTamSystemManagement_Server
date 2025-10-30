import { Op, Sequelize } from "sequelize";
import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Box from "../../../models/order/box.js";
import PlanningPaper from "../../../models/planning/planningPaper.js";
import MachinePaper from "../../../models/admin/machinePaper.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import WasteNormPaper from "../../../models/admin/wasteNormPaper.js";
import WaveCrestCoefficient from "../../../models/admin/waveCrestCoefficient.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import planningBoxMachineTime from "../../../models/planning/planningBoxMachineTime.js";
import { getPlanningPaperByField } from "../../../utils/helper/planningHelper.js";
import {
  calculateTimeRunning,
  updateSortPlanning,
} from "../../../service/planning/timeRunningService.js";

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
      attributes: {
        exclude: [
          "lengthPaperCustomer",
          "paperSizeCustomer",
          "quantityCustomer",
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
        ],
      },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product, attributes: ["typeProduct", "productName"] },
        { model: Box, as: "box", attributes: ["boxId"] },
        { model: PlanningPaper, attributes: ["planningId", "runningPlan", "qtyProduced"] },
      ],
      order: [
        [
          Sequelize.literal(`CAST(SUBSTRING_INDEX(\`Order\`.\`orderId\`, '/', 1) AS UNSIGNED)`),
          "ASC",
        ],
        ["dateRequestShipping", "ASC"],
      ],
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
  const { orderId } = req.query;
  const planningData = req.body;

  if (!orderId) {
    return res.status(404).json({ message: "Missing orderId or newStatus" });
  }

  try {
    // 1) Lấy thông tin Order kèm các quan hệ
    const order = await Order.findOne({
      where: { orderId },
      attributes: {
        exclude: [
          "lengthPaperCustomer",
          "paperSizeCustomer",
          "acreage",
          "dvt",
          "price",
          "pricePaper",
          "discount",
          "profit",
          "vat",
          "totalPriceVAT",
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
        { model: Product, attributes: ["typeProduct", "productName"] },
        { model: Box, as: "box" },
        { model: PlanningPaper, attributes: ["planningId", "runningPlan"] },
      ],
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { chooseMachine } = planningData;

    // 2) Lấy thông số định mức và hệ số sóng cho máy đã chọn
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
      planningData.songE2Replace,
      planningData.matE2Replace,
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
      let flute = { E: 0, B: 0, C: 0, E2: 0 };
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

          if (letter === "E") {
            if (countE === 1) flute.E2 += loss;
            else flute[letter] += loss;
          } else {
            flute[letter] += loss;
          }
        }
      }

      // 5.1) Lớp liner cuối cùng
      const lastLiner = [...layers].reverse().find((l) => l.kind === "liner");
      if (lastLiner) {
        softLiner = gkTh * wasteNorm.waveCrestSoft * (lastLiner.thickness / 1000);
      }

      // 5.2) Tính hao phí, dao, tổng hao hụt
      const bottom = flute.E + flute.B + flute.C + softLiner;

      const haoPhi =
        wasteNorm.waveCrestSoft > 0
          ? (runningPlan / numberChild) *
            (bottom / wasteNorm.waveCrestSoft) *
            (wasteNorm.lossInProcess / 100)
          : 0;

      const knife =
        wasteNorm.waveCrestSoft > 0
          ? (bottom / wasteNorm.waveCrestSoft) * wasteNorm.lossInSheetingAndSlitting
          : 0;

      const totalLoss = flute.E + flute.B + flute.C + flute.E2 + haoPhi + knife + bottom;

      return {
        fluteE: roundSmart(flute.E),
        fluteB: roundSmart(flute.B),
        fluteC: roundSmart(flute.C),
        fluteE2: roundSmart(flute.E2),
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
      //check if orderId is exited in PlanningBox
      const existedOrderId = await PlanningBox.findOne({ where: { orderId: orderId } });

      if (!existedOrderId) {
        boxPlan = await PlanningBox.create({
          planningId: paperPlan.planningId,
          orderId,

          day: paperPlan.dayReplace,
          matE: paperPlan.matEReplace,
          matB: paperPlan.matBReplace,
          matC: paperPlan.matCReplace,
          matE2: paperPlan.matE2Replace,
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
    }

    //9) dựa vào các hasIn, hasBe, hasXa... để tạo ra planning box time
    if (boxPlan) {
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

      const machineTimes = Object.entries(machineMap)
        .filter(([flag]) => boxPlan[flag] === true)
        .map(([_, machineName]) => ({
          planningBoxId: boxPlan.planningBoxId,
          machine: machineName,
          runningPlan: order.quantityCustomer,
        }));

      if (machineTimes.length > 0) {
        await planningBoxMachineTime.bulkCreate(machineTimes);
      }
    }

    await redisCache.del(`planning:machine:${chooseMachine}`);

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
              "day",
              "matE",
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
              "numberChild",
              "lengthPaperManufacture",
              "paperSizeManufacture",
              "status",
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
    const overflowRemoveFields = ["runningPlan", "quantityManufacture"];

    sortedPlannings.forEach((planning) => {
      const original = {
        ...planning.toJSON(),
        timeRunning: planning.timeRunning,
        dayStart: planning.dayStart,
      };
      allPlannings.push(original);

      if (planning.timeOverFlow) {
        const overflow = { ...planning.toJSON() };

        overflow.isOverflow = true;
        overflow.dayStart = planning.timeOverFlow.overflowDayStart;
        overflow.timeRunning = planning.timeOverFlow.overflowTimeRunning;
        overflow.dayCompleted = planning.timeOverFlow.overflowDayCompleted;

        overflowRemoveFields.forEach((f) => delete overflow[f]);
        if (overflow.Order) {
          ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach(
            (item) => delete overflow.Order[item]
          );
        }

        allPlannings.push(overflow);
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

//pause or accept lack of qty
export const pauseOrAcceptLackQtyPLanning = async (req, res) => {
  const { planningIds, newStatus, rejectReason } = req.body;

  if (!Array.isArray(planningIds) || planningIds.length === 0) {
    return res.status(400).json({ message: "Missing or invalid planningIds" });
  }

  try {
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

    if (newStatus !== "complete") {
      for (const planning of plannings) {
        if (planning.orderId) {
          const order = await Order.findOne({
            where: { orderId: planning.orderId },
          });

          if (order) {
            //case: cancel planning -> status:reject order
            //if qtyProduced = 0 -> status:reject order -> delete planning paper&box -> minus debt of customer
            if (newStatus === "reject") {
              if (planning.qtyProduced > 0) {
                return res.status(400).json({
                  message: `Không thể hủy đơn ${planning.planningId} vì đã có sản lượng.`,
                });
              }

              // Trả order về reject
              await order.update({ status: newStatus, rejectReason });

              // Trừ công nợ khách hàng
              const customer = await Customer.findOne({
                attributes: ["customerId", "debtCurrent"],
                where: { customerId: order.customerId },
              });

              if (customer) {
                let debtAfter = (customer.debtCurrent || 0) - order.totalPrice;
                if (debtAfter < 0) debtAfter = 0; //tránh âm tiền

                await customer.update({ debtCurrent: debtAfter });
              }

              // Xoá dữ liệu phụ thuộc
              const dependents = await PlanningBox.findAll({
                where: { planningId: planning.planningId },
              });

              for (const box of dependents) {
                await planningBoxMachineTime.destroy({
                  where: { planningBoxId: box.planningBoxId },
                });
                await box.destroy();
              }

              //xóa planning paper
              await planning.destroy();
            }
            //case pause planning -> status:accept or stop order
            //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
            //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
            else if (newStatus === "stop") {
              const dependents = await PlanningBox.findAll({
                where: { planningId: planning.planningId },
              });

              if (planning.qtyProduced > 0) {
                await order.update({ status: newStatus, rejectReason: rejectReason });
                await planning.update({ status: newStatus });

                for (const box of dependents) {
                  await planningBoxMachineTime.update(
                    { status: newStatus },
                    { where: { planningBoxId: box.planningBoxId } }
                  );
                }
              } else {
                await order.update({ status: "accept" });

                for (const box of dependents) {
                  await planningBoxMachineTime.destroy({
                    where: { planningBoxId: box.planningBoxId },
                  });
                  await box.destroy();
                }

                //xóa planning paper
                await planning.destroy();
              }
            }
          }
        }
      }
    } else {
      // complete -> accept lack of qty
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
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;

  if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
    return res.status(400).json({ message: "Missing or invalid updateIndex" });
  }

  const transaction = await PlanningPaper.sequelize.transaction();
  const cacheKey = `planning:machine:${machine}`;

  try {
    // 1️⃣ Cập nhật sortPlanning
    await updateSortPlanning(updateIndex, transaction);

    // 2️⃣ Lấy lại danh sách đã update
    const plannings = await PlanningPaper.findAll({
      where: { planningId: updateIndex.map((i) => i.planningId) },
      include: [{ model: Order }, { model: timeOverflowPlanning, as: "timeOverFlow" }],
      order: [["sortPlanning", "ASC"]],
      transaction,
    });

    // 3️⃣ Lấy thông tin máy
    const machineInfo = await MachinePaper.findOne({
      where: { machineName: machine },
      transaction,
    });
    if (!machineInfo) throw new Error("Machine not found");

    // 4️⃣ Tính toán thời gian chạy
    const updatedPlannings = await calculateTimeRunning({
      plannings,
      machineInfo,
      machine,
      dayStart,
      timeStart,
      totalTimeWorking,
      transaction,
    });

    await transaction.commit();
    await redisCache.del(cacheKey);

    // 5️⃣ Phát socket
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
