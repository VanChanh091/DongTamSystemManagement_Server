"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningStatusService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const appError_1 = require("../../utils/appError");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const planningPaper_1 = require("../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const sequelize_1 = require("sequelize");
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const planningRepository_1 = require("../../repository/planningRepository");
const machineLabels_1 = require("../../assest/configs/machineLabels");
const order_1 = require("../../models/order/order");
const wasteNormPaper_1 = require("../../models/admin/wasteNormPaper");
const waveCrestCoefficient_1 = require("../../models/admin/waveCrestCoefficient");
const planningBox_1 = require("../../models/planning/planningBox");
const devEnvironment = process.env.NODE_ENV !== "production";
const { stop, order } = cacheManager_1.CacheManager.keys.planning;
exports.planningStatusService = {
    //===============================PLANNING ORDER=====================================
    getOrderAccept: async () => {
        const cacheKey = order.all;
        try {
            const { isChanged: order } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, where: { status: "accept" } }], "planningOrder");
            const { isChanged: planningPaper } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "planningOrderPaper", { setCache: false });
            const isChangedData = order || planningPaper;
            if (isChangedData) {
                await cacheManager_1.CacheManager.clearOrderAccept();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    return { ...JSON.parse(cachedData), fromCache: true };
                }
            }
            const result = await planningRepository_1.planningRepository.getOrderAccept();
            const responseData = { message: "get order accept successfully", data: result };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get all order accept failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    planningOrder: async (orderId, planningData) => {
        try {
            // 1) Lấy thông tin Order kèm các quan hệ
            const order = await planningRepository_1.planningRepository.findOrderById(orderId);
            if (!order)
                throw appError_1.AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
            const { chooseMachine } = planningData;
            // 2) Lấy thông số định mức và hệ số sóng cho máy đã chọn
            const wasteNorm = await planningRepository_1.planningRepository.getModelById({
                model: wasteNormPaper_1.WasteNormPaper,
                where: { machineName: chooseMachine },
            });
            const waveCoeff = await planningRepository_1.planningRepository.getModelById({
                model: waveCrestCoefficient_1.WaveCrestCoefficient,
                where: {
                    machineName: chooseMachine,
                },
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
                const totalLength = runningPlan / numberChild;
                const oneM2WaveCrestSoft = bottom / wasteNorm.waveCrestSoft;
                const haoPhi = wasteNorm.waveCrestSoft > 0
                    ? totalLength * oneM2WaveCrestSoft * (wasteNorm.lossInProcess / 100)
                    : 0;
                const knife = wasteNorm.waveCrestSoft > 0
                    ? oneM2WaveCrestSoft * wasteNorm.lossInSheetingAndSlitting
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
            const paperPlan = await planningRepository_1.planningRepository.createData({
                model: planningPaper_1.PlanningPaper,
                data: {
                    orderId,
                    status: "planning",
                    ...planningData,
                },
            });
            // 7) Tính phế liệu và cập nhật lại plan giấy tấm
            const waste = calculateWaste(layers, planningData.ghepKho, wasteNorm, waveCoeff, planningData.runningPlan, order.numberChild, waveTypes);
            Object.assign(paperPlan, waste);
            await paperPlan.save();
            let boxPlan = null;
            // 8) Nếu đơn hàng có làm thùng, tạo thêm kế hoạch lam-thung (waiting)
            const box = order.box;
            if (order.isBox) {
                boxPlan = await planningRepository_1.planningRepository.createData({
                    model: planningBox_1.PlanningBox,
                    data: {
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
                    },
                });
            }
            //9) dựa vào các hasIn, hasBe, hasXa... để tạo ra planning box time
            if (boxPlan) {
                const machineTimes = Object.entries(machineLabels_1.machineMap)
                    .filter(([flag]) => boxPlan[flag] === true)
                    .map(([_, machineName]) => ({
                    planningBoxId: boxPlan.planningBoxId,
                    machine: machineName,
                    runningPlan: paperPlan.runningPlan,
                }));
                if (machineTimes.length > 0) {
                    await planningRepository_1.planningRepository.createPlanningBoxTime(machineTimes);
                }
            }
            return {
                message: "Đã tạo kế hoạch thành công.",
                planning: [paperPlan, boxPlan].filter(Boolean),
            };
        }
        catch (error) {
            console.error("planningOrder error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //===============================PLANNING STOP=====================================
    getPlanningStop: async (page, pageSize) => {
        try {
            const cacheKey = stop.page(page);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "planningStop");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearPlanningStop();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data PlanningPaper from Redis");
                    return { ...JSON.parse(cachedData), message: `get all cache planning stop` };
                }
            }
            const totalPlannings = await planningRepository_1.planningRepository.getPlanningPaperCount();
            const totalPages = Math.ceil(totalPlannings / pageSize);
            const whereCondition = { status: "stop" };
            const data = await planningRepository_1.planningRepository.getPlanningPaper({
                page,
                pageSize,
                whereCondition,
                paginate: true,
            });
            const responseData = {
                message: "get all data paper from db",
                data,
                totalPlannings,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("Error fetching planning stop:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    cancelOrContinuePlannning: async ({ planningId, action, }) => {
        try {
            const ids = Array.isArray(planningId) ? planningId : [planningId];
            const plannings = await planningRepository_1.planningRepository.getStopByIds(ids);
            if (plannings.length == 0) {
                throw appError_1.AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
            }
            await planningRepository_1.planningRepository.updateStatusPlanning({
                planningIds: ids,
                action: action,
            });
            return { message: "planning updated successfully" };
        }
        catch (error) {
            console.error("error to cancel or continue planning stop:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningStatusService.js.map