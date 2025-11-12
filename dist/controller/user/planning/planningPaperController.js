"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIndex_TimeRunning = exports.pauseOrAcceptLackQtyPLanning = exports.changeMachinePlanning = exports.getPlanningByGhepKho = exports.getPlanningByFlute = exports.getPlanningByCustomerName = exports.getPlanningByOrderId = exports.getPlanningByMachine = exports.planningOrder = exports.getOrderAccept = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../../models/order/order");
const customer_1 = require("../../../models/customer/customer");
const product_1 = require("../../../models/product/product");
const box_1 = require("../../../models/order/box");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const machinePaper_1 = require("../../../models/admin/machinePaper");
const timeOverflowPlanning_1 = require("../../../models/planning/timeOverflowPlanning");
const wasteNormPaper_1 = require("../../../models/admin/wasteNormPaper");
const waveCrestCoefficient_1 = require("../../../models/admin/waveCrestCoefficient");
const planningBox_1 = require("../../../models/planning/planningBox");
const planningHelper_1 = require("../../../utils/helper/modelHelper/planningHelper");
const timeRunningService_1 = require("../../../service/planning/timeRunningService");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const dotenv_1 = __importDefault(require("dotenv"));
const planningBoxMachineTime_1 = require("../../../models/planning/planningBoxMachineTime");
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//===============================PLANNING ORDER=====================================
//getOrderAccept
const getOrderAccept = async (req, res) => {
    const { order } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = order.all;
    try {
        const { isChanged: order } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, where: { status: "accept" } }], "planningOrder");
        const { isChanged: planningPaper } = await cacheManager_1.CacheManager.check([
            { model: planningPaper_1.PlanningPaper },
            { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
        ], "planningPaper", { setCache: false });
        const isChangedData = order || planningPaper;
        if (isChangedData) {
            await cacheManager_1.CacheManager.clearOrderAccept();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                return res.json({
                    message: "get all order have status:accept from cache",
                    data: JSON.parse(cachedData),
                });
            }
        }
        const data = await order_1.Order.findAll({
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
                    model: customer_1.Customer,
                    attributes: ["customerName", "companyName"],
                },
                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                // { model: Box, as: "box", attributes: ["boxId"] },
                { model: planningPaper_1.PlanningPaper, attributes: ["planningId", "runningPlan", "qtyProduced"] },
            ],
            order: [
                [sequelize_1.Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
                ["dateRequestShipping", "ASC"],
            ],
        });
        await redisCache_1.default.set(cacheKey, JSON.stringify(data), "EX", 3600);
        res.json({ message: "get all order have status:accept", data });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getOrderAccept = getOrderAccept;
//planning order
const planningOrder = async (req, res) => {
    const { orderId } = req.query;
    const planningData = req.body;
    if (!orderId) {
        return res.status(404).json({ message: "Missing orderId or newStatus" });
    }
    try {
        // 1) Lấy thông tin Order kèm các quan hệ
        const order = await order_1.Order.findOne({
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
                    model: customer_1.Customer,
                    attributes: ["customerName", "companyName"],
                },
                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                { model: box_1.Box, as: "box" },
                { model: planningPaper_1.PlanningPaper, attributes: ["planningId", "runningPlan"] },
            ],
        });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        const { chooseMachine } = planningData;
        // 2) Lấy thông số định mức và hệ số sóng cho máy đã chọn
        const wasteNorm = await wasteNormPaper_1.WasteNormPaper.findOne({
            where: { machineName: chooseMachine },
        });
        const waveCoeff = await waveCrestCoefficient_1.WaveCrestCoefficient.findOne({
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
        const parseStructure = (str) => str.split("/").map((seg) => {
            if (/^[EBC]/.test(seg))
                return { kind: "flute", code: seg };
            return {
                kind: "liner",
                thickness: parseFloat(seg.replace(/\D+/g, "")),
            };
        });
        const layers = parseStructure(structStr);
        // 4) Xác định loại sóng từ đơn hàng (flute: "5EB" => ["E", "B"])
        const waveTypes = (order.flute?.match(/[EBC]/gi) || []).map((s) => s.toUpperCase());
        const roundSmart = (num) => Math.round(num * 100) / 100;
        // 5) Hàm tính phế liệu paper
        const calculateWaste = (layers, ghepKho, wasteNorm, waveCoeff, runningPlan, numberChild, waveTypes) => {
            const gkTh = ghepKho / 100;
            let flute = { E: 0, B: 0, C: 0, E2: 0 };
            let softLiner = 0;
            let countE = 0;
            for (let i = 0; i < layers.length; i++) {
                const L = layers[i];
                if (L.kind === "flute") {
                    const letter = L.code[0].toUpperCase();
                    if (!waveTypes.includes(letter))
                        continue;
                    const fluteTh = parseFloat(L.code.replace(/\D+/g, "")) / 1000;
                    const prev = layers[i - 1];
                    const linerBefore = prev && prev.kind === "liner" ? prev.thickness / 1000 : 0;
                    let coef = 0;
                    if (letter === "E") {
                        const isFirstE = countE === 0;
                        coef = isFirstE ? waveCoeff.fluteE_1 : waveCoeff.fluteE_2;
                        const loss = gkTh * wasteNorm.waveCrest * linerBefore +
                            gkTh * wasteNorm.waveCrest * fluteTh * coef;
                        if (isFirstE) {
                            flute.E += loss;
                        }
                        else {
                            flute.E2 += loss;
                        }
                        countE++;
                    }
                    else {
                        coef = waveCoeff[`flute${letter}`] || 0;
                        const loss = gkTh * wasteNorm.waveCrest * linerBefore +
                            gkTh * wasteNorm.waveCrest * fluteTh * coef;
                        if (letter in flute) {
                            flute[letter] += loss;
                        }
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
            const haoPhi = wasteNorm.waveCrestSoft > 0
                ? (runningPlan / numberChild) *
                    (bottom / wasteNorm.waveCrestSoft) *
                    (wasteNorm.lossInProcess / 100)
                : 0;
            const knife = wasteNorm.waveCrestSoft > 0
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
        const paperPlan = await planningPaper_1.PlanningPaper.create({
            orderId,
            status: "planning",
            ...planningData,
        });
        // 7) Tính phế liệu và cập nhật lại plan giấy tấm
        const waste = calculateWaste(layers, planningData.ghepKho, wasteNorm, waveCoeff, planningData.runningPlan, order.numberChild, waveTypes);
        Object.assign(paperPlan, waste);
        await paperPlan.save();
        let boxPlan = null;
        // 8) Nếu đơn hàng có làm thùng, tạo thêm kế hoạch lam-thung (waiting)
        const box = order.box;
        if (order.isBox) {
            //check if orderId is exited in PlanningBox
            const existedOrderId = await planningBox_1.PlanningBox.findOne({ where: { orderId: orderId } });
            if (!existedOrderId) {
                boxPlan = await planningBox_1.PlanningBox.create({
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
                await planningBoxMachineTime_1.PlanningBoxTime.bulkCreate(machineTimes);
            }
        }
        return res.status(201).json({
            message: "Đã tạo kế hoạch thành công.",
            planning: [paperPlan, boxPlan].filter(Boolean),
        });
    }
    catch (error) {
        console.error("planningOrder error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};
exports.planningOrder = planningOrder;
//===============================PRODUCTION QUEUE=====================================
//get planning by machine
const getPlanningByMachine = async (req, res) => {
    const { machine } = req.query;
    if (!machine) {
        return res.status(400).json({ message: "Missing 'machine' query parameter" });
    }
    const { paper } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = paper.machine(machine);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check([
            { model: planningPaper_1.PlanningPaper },
            { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
        ], "planningPaper");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearPlanningPaper();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data PlanningPaper from Redis");
                return res.json({
                    message: `get all cache planning:machine:${machine}`,
                    data: JSON.parse(cachedData),
                });
            }
        }
        const data = await getPlanningByMachineSorted(machine);
        await redisCache_1.default.set(cacheKey, JSON.stringify(data), "EX", 1800);
        res.status(200).json({
            message: `get planning by machine: ${machine}`,
            data,
        });
    }
    catch (error) {
        console.error("error", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getPlanningByMachine = getPlanningByMachine;
//sort planning
const getPlanningByMachineSorted = async (machine) => {
    try {
        const data = await planningPaper_1.PlanningPaper.findAll({
            where: { chooseMachine: machine },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: {
                        exclude: ["createdAt", "updatedAt"],
                    },
                },
                {
                    model: order_1.Order,
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
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        {
                            model: box_1.Box,
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
            if (["planning", "lackQty", "producing"].includes(planning.status))
                return true;
            if (planning.status === "complete") {
                const dayCompleted = planning.dayCompleted ? new Date(planning.dayCompleted) : null;
                if (!dayCompleted || isNaN(dayCompleted.getTime()))
                    return false;
                const expiredDate = truncateToDate(new Date(dayCompleted));
                expiredDate.setDate(expiredDate.getDate() + 3);
                return expiredDate >= now;
            }
            return false;
        });
        const withSort = validData.filter((item) => item.sortPlanning !== null);
        const noSort = validData.filter((item) => item.sortPlanning === null);
        // Sắp xếp đơn có sortPlanning theo thứ tự được lưu
        withSort.sort((a, b) => (a.sortPlanning ?? 0) - (b.sortPlanning ?? 0));
        // Sắp xếp đơn chưa có sortPlanning theo logic yêu cầu
        noSort.sort((a, b) => {
            const wavePriorityMap = {
                C: 3,
                B: 2,
                E: 1,
            };
            //5BC -> 5
            const getLayer = (flute) => {
                if (!flute || flute.length < 1)
                    return 0;
                return parseInt(flute.trim()[0]) || 0;
            };
            //5BC -> BC [2,3]
            const getWavePriorityList = (flute) => {
                if (!flute || flute.length < 2)
                    return [];
                const waves = flute.trim().slice(1).toUpperCase().split("");
                return waves.map((w) => wavePriorityMap[w] || 0);
            };
            //compare ghepKho -> layer (5BC -> 5) -> letter (5BC -> BC)
            const ghepA = a.ghepKho ?? 0;
            const ghepB = b.ghepKho ?? 0;
            if (ghepB !== ghepA)
                return ghepB - ghepA;
            const layerA = getLayer(a.Order.flute ?? "");
            const layerB = getLayer(b.Order.flute ?? "");
            if (layerB !== layerA)
                return layerB - layerA;
            const waveA = getWavePriorityList(a.Order.flute ?? "");
            const waveB = getWavePriorityList(b.Order.flute ?? "");
            const maxLength = Math.max(waveA.length, waveB.length);
            for (let i = 0; i < maxLength; i++) {
                const priA = waveA[i] ?? 0;
                const priB = waveB[i] ?? 0;
                if (priB !== priA)
                    return priB - priA;
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
                    ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach((item) => delete overflow.Order[item]);
                }
                allPlannings.push(overflow);
            }
        });
        return allPlannings;
    }
    catch (error) {
        console.error("Error fetching planning by machine:", error);
        throw error;
    }
};
//get by orderId
const getPlanningByOrderId = async (req, res) => {
    const { orderId, machine } = req.query;
    if (!machine || !orderId) {
        return res.status(400).json({ message: "Thiếu machine hoặc orderId" });
    }
    const { paper } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = paper.machine(machine);
    try {
        const cachedData = await redisCache_1.default.get(cacheKey);
        if (cachedData) {
            if (devEnvironment)
                console.log("✅ Data planning from Redis");
            const parsedData = JSON.parse(cachedData);
            // Tìm kiếm tương đối trong cache
            const filteredData = parsedData.filter((item) => item.orderId.toLowerCase().includes(orderId.toLowerCase()));
            return res.json({
                message: "Get planning by orderId from cache",
                data: filteredData,
            });
        }
        const planning = await planningPaper_1.PlanningPaper.findAll({
            where: {
                orderId: {
                    [sequelize_1.Op.like]: `%${orderId}%`,
                },
            },
            include: [
                {
                    model: order_1.Order,
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
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
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
    }
    catch (error) {
        console.error("❌ Lỗi khi tìm orderId:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getPlanningByOrderId = getPlanningByOrderId;
//get by customer name
const getPlanningByCustomerName = async (req, res) => (0, planningHelper_1.getPlanningPaperByField)(req, res, "customerName");
exports.getPlanningByCustomerName = getPlanningByCustomerName;
//get by flute
const getPlanningByFlute = async (req, res) => (0, planningHelper_1.getPlanningPaperByField)(req, res, "flute");
exports.getPlanningByFlute = getPlanningByFlute;
//get by ghepKho
const getPlanningByGhepKho = async (req, res) => (0, planningHelper_1.getPlanningPaperByField)(req, res, "ghepKho");
exports.getPlanningByGhepKho = getPlanningByGhepKho;
//change planning machine
const changeMachinePlanning = async (req, res) => {
    const { planningIds, newMachine } = req.body;
    try {
        if (!Array.isArray(planningIds) || planningIds.length === 0) {
            return res.status(400).json({ message: "Missing or invalid planningIds" });
        }
        const plannings = await planningPaper_1.PlanningPaper.findAll({
            where: {
                planningId: { [sequelize_1.Op.in]: planningIds },
            },
        });
        if (plannings.length === 0) {
            return res.status(404).json({ message: "No planning found" });
        }
        for (const planning of plannings) {
            planning.chooseMachine = newMachine;
            planning.sortPlanning = null;
            await planning.save();
        }
        res.status(200).json({ message: "Change machine complete", plannings });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.changeMachinePlanning = changeMachinePlanning;
//pause or accept lack of qty
const pauseOrAcceptLackQtyPLanning = async (req, res) => {
    const { planningIds, newStatus, rejectReason } = req.body;
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
        return res.status(400).json({ message: "Missing or invalid planningIds" });
    }
    try {
        const plannings = await planningPaper_1.PlanningPaper.findAll({
            where: {
                planningId: {
                    [sequelize_1.Op.in]: planningIds,
                },
            },
        });
        if (plannings.length === 0) {
            return res.status(404).json({ message: "No planning found" });
        }
        if (newStatus !== "complete") {
            for (const planning of plannings) {
                if (planning.orderId) {
                    const order = await order_1.Order.findOne({
                        where: { orderId: planning.orderId },
                    });
                    if (order) {
                        //case: cancel planning -> status:reject order
                        //if qtyProduced = 0 -> status:reject order -> delete planning paper&box -> minus debt of customer
                        if (newStatus === "reject") {
                            if ((planning.qtyProduced ?? 0) > 0) {
                                return res.status(400).json({
                                    message: `Không thể hủy đơn ${planning.planningId} vì đã có sản lượng.`,
                                });
                            }
                            // Trả order về reject
                            await order.update({ status: newStatus, rejectReason });
                            // Trừ công nợ khách hàng
                            const customer = await customer_1.Customer.findOne({
                                attributes: ["customerId", "debtCurrent"],
                                where: { customerId: order.customerId },
                            });
                            if (customer) {
                                let debtAfter = (customer.debtCurrent || 0) - order.totalPrice;
                                if (debtAfter < 0)
                                    debtAfter = 0; //tránh âm tiền
                                await customer.update({ debtCurrent: debtAfter });
                            }
                            // Xoá dữ liệu phụ thuộc
                            const dependents = await planningBox_1.PlanningBox.findAll({
                                where: { planningId: planning.planningId },
                            });
                            for (const box of dependents) {
                                await planningBoxMachineTime_1.PlanningBoxTime.destroy({
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
                            const dependents = await planningBox_1.PlanningBox.findAll({
                                where: { planningId: planning.planningId },
                            });
                            if ((planning.qtyProduced ?? 0) > 0) {
                                await order.update({ status: newStatus, rejectReason: rejectReason });
                                await planning.update({ status: newStatus });
                                for (const box of dependents) {
                                    await planningBoxMachineTime_1.PlanningBoxTime.update({ status: newStatus }, { where: { planningBoxId: box.planningBoxId } });
                                }
                            }
                            else {
                                await order.update({ status: "accept" });
                                for (const box of dependents) {
                                    await planningBoxMachineTime_1.PlanningBoxTime.destroy({
                                        where: { planningBoxId: box.planningBoxId },
                                    });
                                    await box.destroy();
                                }
                                //xóa planning paper
                                await planning.destroy();
                                //clear cache
                                await cacheManager_1.CacheManager.clearOrderAccept();
                            }
                        }
                    }
                }
            }
        }
        else {
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
                    await timeOverflowPlanning_1.timeOverflowPlanning.update({ status: newStatus }, { where: { planningId: planning.planningId } });
                }
                const planningBox = await planningBox_1.PlanningBox.findOne({
                    where: { planningId: planning.planningId },
                });
                if (!planningBox) {
                    continue;
                }
                await planningBoxMachineTime_1.PlanningBoxTime.update({ runningPlan: planning.qtyProduced ?? 0 }, { where: { planningBoxId: planningBox.planningBoxId } });
            }
        }
        res.status(200).json({
            message: "Update status planning successfully",
        });
    }
    catch (error) {
        if (devEnvironment)
            console.log("error pause planning", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.pauseOrAcceptLackQtyPLanning = pauseOrAcceptLackQtyPLanning;
//update index & time running
const updateIndex_TimeRunning = async (req, res) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;
    if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
        return res.status(400).json({ message: "Missing or invalid updateIndex" });
    }
    const transaction = await planningPaper_1.PlanningPaper.sequelize?.transaction();
    try {
        // 1️⃣ Cập nhật sortPlanning
        await (0, timeRunningService_1.updateSortPlanning)(updateIndex, transaction);
        // 2️⃣ Lấy lại danh sách đã update
        const plannings = await planningPaper_1.PlanningPaper.findAll({
            where: { planningId: updateIndex.map((i) => i.planningId) },
            include: [{ model: order_1.Order }, { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" }],
            order: [["sortPlanning", "ASC"]],
            transaction,
        });
        // 3️⃣ Lấy thông tin máy
        const machineInfo = await machinePaper_1.MachinePaper.findOne({
            where: { machineName: machine },
            transaction,
        });
        if (!machineInfo)
            throw new Error("Machine not found");
        // 4️⃣ Tính toán thời gian chạy
        const updatedPlannings = await (0, timeRunningService_1.calculateTimeRunning)({
            plannings,
            machineInfo,
            machine,
            dayStart,
            timeStart,
            totalTimeWorking,
            transaction,
        });
        await transaction?.commit();
        // 5️⃣ Phát socket
        const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
        req.io?.to(roomName).emit("planningPaperUpdated", {
            machine,
            message: `Kế hoạch của ${machine} đã được cập nhật.`,
        });
        return res.status(200).json({
            message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
            data: updatedPlannings,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("❌ Update failed:", error);
        return res.status(500).json({
            message: "❌ Lỗi khi cập nhật và tính toán thời gian",
            error: error.message,
        });
    }
};
exports.updateIndex_TimeRunning = updateIndex_TimeRunning;
//# sourceMappingURL=planningPaperController.js.map