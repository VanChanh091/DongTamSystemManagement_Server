"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningStatusService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const user_1 = require("../../models/user/user");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const meiliService_1 = require("../system/meiliService");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningBox_1 = require("../../models/planning/planningBox");
const wasteNormPaper_1 = require("../../models/admin/wasteNormPaper");
const labelFields_1 = require("../../assets/labelFields");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const waveCrestCoefficient_1 = require("../../models/admin/waveCrestCoefficient");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const planningBoxRepository_1 = require("../../repository/planning/planningBoxRepository");
const planningPaper_1 = require("../../models/planning/planningPaper");
const planningPaperRepository_1 = require("../../repository/planning/planningPaperRepository");
const planningStatusRepository_1 = require("../../repository/planning/planningStatusRepository");
const paper_requirement_layers_1 = require("../../models/planning/requirement/paper_requirement_layers");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const orderApproved_1 = require("../../models/order/orderApproved");
const devEnvironment = process.env.NODE_ENV !== "production";
const { stop, order } = cacheKey_1.CacheKey.planning;
exports.planningStatusService = {
    //===============================PLANNING ORDER=====================================
    //"unplanned" | "planned" | "partial"
    getOrderAccept: async (type) => {
        // const cacheKey = order.all;
        try {
            // const { isChanged: order } = await CacheManager.check(
            //   [{ model: Order, where: { status: "accept" } }],
            //   "planningOrder",
            // );
            // const { isChanged: planningPaper } = await CacheManager.check(
            //   [
            //     { model: PlanningPaper },
            //     { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
            //   ],
            //   "planningOrderPaper",
            //   { setCache: false },
            // );
            // const isChangedData = order || planningPaper;
            // if (isChangedData) {
            //   await CacheManager.clear("orderAccept");
            // } else {
            //   const cachedData = await redisCache.get(cacheKey);
            //   if (cachedData) {
            //     return { ...JSON.parse(cachedData), fromCache: true };
            //   }
            // }
            const result = await planningStatusRepository_1.planningStatusRepository.getOrderAccept(type);
            // await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);
            return { message: "get order accept successfully", data: result };
        }
        catch (error) {
            console.error("❌ get all order accept failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getOrderAcceptByField: async (type, field, keyword) => {
        try {
            const validFields = ["orderId", "customerName", "productName", "QC_box"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("orders");
            // Tìm kiếm trên Meilisearch để lấy orderId
            const searchResult = await index.search(keyword, {
                filter: ["status IN [accept]"],
                attributesToSearchOn: [field],
                attributesToRetrieve: ["orderId"], // Chỉ lấy orderId
            });
            const orderIds = searchResult.hits.map((hit) => hit.orderId);
            if (orderIds.length === 0) {
                return { message: "No orders found", data: [] };
            }
            const result = await planningStatusRepository_1.planningStatusRepository.getOrderAccept(type);
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = orderIds
                .map((id) => result.find((order) => order.orderId === id))
                .filter(Boolean);
            return { message: `get order accept by ${field} successfully`, data: finalData };
        }
        catch (error) {
            console.error(`Failed to get orders by ${field}:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    planningOrder: async (orderId, planningData) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const order = await planningStatusRepository_1.planningStatusRepository.findOrderById(orderId, transaction);
                if (!order)
                    throw appError_1.AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
                const { chooseMachine, runningPlan, ghepKho } = planningData;
                // Lấy thông số định mức và hệ số sóng cho máy đã chọn
                const [wasteNorm, waveCoeff] = await Promise.all([
                    crud_helper_repository_1.CrudHelper.findOne({
                        model: wasteNormPaper_1.WasteNormPaper,
                        where: { machineName: chooseMachine },
                        options: { transaction },
                    }),
                    crud_helper_repository_1.CrudHelper.findOne({
                        model: waveCrestCoefficient_1.WaveCrestCoefficient,
                        where: { machineName: chooseMachine },
                        options: { transaction },
                    }),
                ]);
                if (!wasteNorm || !waveCoeff) {
                    throw new Error(`WasteNorm or WaveCrestCoefficient not found for machine: ${chooseMachine}`);
                }
                // Parse cấu trúc giấy thành mảng lớp
                const layers = parsePaperStructure(planningData);
                const waveTypes = (order.flute?.match(/[EBC]/gi) || []).map((s) => s.toUpperCase());
                // Tính toán phế liệu định mức
                const wasteResult = calculateWaste({
                    layers,
                    ghepKho: ghepKho,
                    wasteNorm,
                    waveCoeff,
                    runningPlan: runningPlan,
                    numberChild: order.numberChild,
                    waveTypes,
                });
                // Tạo kế hoạch làm giấy tấm
                const paperPlan = await crud_helper_repository_1.CrudHelper.createData({
                    model: planningPaper_1.PlanningPaper,
                    data: {
                        orderId,
                        status: "planning",
                        totalPrice: order.pricePaper * runningPlan,
                        ...planningData,
                        ...wasteResult,
                    },
                    transaction,
                });
                //tính toán định mức giấy sản xuất
                const lengthPaper = paperPlan.chooseMachine === "Máy Quấn Cuồn" ? 1 : paperPlan.lengthPaperPlanning;
                const paperRequirement = await handlePaperRequirements({
                    planningId: paperPlan.planningId,
                    planningData,
                    waveCoeff,
                    runningPlan: paperPlan.runningPlan,
                    length: lengthPaper,
                    size: paperPlan.sizePaperPLaning,
                    ghepKho,
                    transaction,
                });
                // Nếu đơn hàng có làm thùng, tạo thêm kế hoạch làm thùng
                const boxPlan = await handleCreateBoxPlanning({
                    order,
                    paperPlan,
                    machineMap: labelFields_1.machineMap,
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                await syncPlanningOrderToMeili({
                    planningId: paperPlan.planningId,
                    isBox: !!order.isBox,
                    transaction,
                });
                return {
                    message: "Đã tạo kế hoạch thành công.",
                    planning: [paperPlan, boxPlan].filter(Boolean),
                    paperRequirement,
                };
            });
        }
        catch (error) {
            console.error("planningOrder error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    backOrderToReject: async (req, orderId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const order = await order_1.Order.findOne({
                    where: { orderId },
                    attributes: ["orderId", "userId", "orderSortValue"],
                    include: [{ model: user_1.User, attributes: ["fullName"] }],
                    transaction,
                });
                if (!order) {
                    throw appError_1.AppError.BadRequest("Order not found", "ORDER_NOT_FOUND");
                }
                const planningPapers = await planningPaper_1.PlanningPaper.findAll({
                    where: { orderId },
                    attributes: ["planningId", "qtyProduced"],
                    transaction,
                });
                if (planningPapers.some((p) => (p.qtyProduced ?? 0) > 0)) {
                    throw appError_1.AppError.BadRequest("Order has produced items", "ORDER_HAS_PRODUCED_ITEMS");
                }
                //check inventory
                const inventory = await inventory_1.Inventory.findOne({
                    where: { orderId },
                    transaction,
                });
                if (inventory) {
                    if ((inventory.valueInventory ?? 0) !== 0) {
                        throw appError_1.AppError.BadRequest("Không thể hoàn đơn đã có giá trị tồn", "INVENTORY_VALUE_NOT_ZERO");
                    }
                    await inventory.destroy({ transaction });
                }
                await Promise.all([
                    order.update({ status: "reject" }, { transaction }),
                    crud_helper_repository_1.CrudHelper.createData({
                        model: orderApproved_1.OrderApproved,
                        data: {
                            approvedBy: req.user.fullName,
                            action: "RETURNED",
                            orderId: order.orderId,
                        },
                        transaction,
                    }),
                ]);
                //socket
                const ownerId = order.userId;
                const badgeCount = await order_1.Order.count({
                    where: { status: "reject", userId: ownerId },
                    transaction,
                });
                const roomName = `reject-order-${ownerId}`;
                const sockets = await req.io?.in(roomName).fetchSockets();
                // console.log(`-----------------------------------`);
                // console.log(`📡 Event: updateBadgeCount`);
                // console.log(`🏠 Room Target: ${roomName}`);
                // console.log(`👥 Active sockets: ${sockets?.length ?? 0}`);
                // console.log(`-----------------------------------`);
                const hasSocket = sockets && sockets.length > 0;
                if (!hasSocket) {
                    if (devEnvironment)
                        console.log(`⚠️ No one is in room ${roomName}, skip emitting.`);
                    return { message: "Order status updated successfully, no active socket to notify" };
                }
                req.io?.to(roomName).emit("updateBadgeCount", {
                    type: "REJECTED_ORDER",
                    count: badgeCount,
                });
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                    data: { orderSortValue: order.orderSortValue, status: "reject" },
                    transaction,
                    isUpdate: true,
                });
            });
        }
        catch (error) {
            console.error("back order failed:", error);
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
                await cacheManager_1.CacheManager.clear("planningStop");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data PlanningPaper from Redis");
                    return { ...JSON.parse(cachedData), message: `get all cache planning stop` };
                }
            }
            const whereCondition = { status: "stop" };
            const { rows, count } = await planningPaperRepository_1.planningPaperRepository.getPlanningPaper({
                page,
                pageSize,
                whereCondition,
                paginate: true,
            });
            const totalPages = Math.ceil(count / pageSize);
            const responseData = {
                message: "get all data paper from db",
                data: rows,
                totalPlannings: count,
                totalPages,
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("Error fetching planning stop:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    cancelOrContinuePlannning: async ({ planningId, action, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const ids = Array.isArray(planningId) ? planningId : [planningId];
                const plannings = await planningStatusRepository_1.planningStatusRepository.getStopByIds(ids, transaction);
                if (plannings.length == 0) {
                    throw appError_1.AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
                }
                const planningUpdated = await planningStatusRepository_1.planningStatusRepository.updateStatusPlanning({
                    planningIds: ids,
                    action: action,
                    transaction,
                });
                const orderIds = [...new Set(planningUpdated.map((p) => p.orderId))];
                if (action === "planning") {
                    await order_1.Order.update({ status: "planning" }, { where: { orderId: { [sequelize_1.Op.in]: orderIds } }, transaction });
                }
                //--------------------MEILISEARCH-----------------------
                if (planningUpdated.length > 0) {
                    const dataForMeili = planningUpdated.map((p) => ({
                        planningId: p.planningId,
                        status: action,
                    }));
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                        data: dataForMeili,
                        transaction,
                        isUpdate: true,
                    });
                }
                return { message: "planning updated successfully" };
            });
        }
        catch (error) {
            console.error("error to cancel or continue planning stop:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//helper for planning order
const parsePaperStructure = (planningData) => {
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
    return structStr.split("/").map((seg) => {
        if (/^[EBC]/.test(seg))
            return { kind: "flute", code: seg };
        const thicknessMatch = seg.match(/\d+$/);
        return {
            kind: "liner",
            thickness: thicknessMatch ? parseFloat(thicknessMatch[0]) : 0,
        };
    });
};
const calculateWaste = ({ layers, ghepKho, wasteNorm, waveCoeff, runningPlan, numberChild, waveTypes, }) => {
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
            const fluteTh = parseFloat(L.code.match(/\d+$/)?.[0] || "0") / 1000;
            const prev = layers[i - 1];
            const linerBefore = prev && prev.kind === "liner" ? prev.thickness / 1000 : 0;
            let coef = 0;
            if (letter === "E") {
                const isFirstE = countE === 0;
                coef = isFirstE ? waveCoeff.fluteE_1 : waveCoeff.fluteE_2;
                const loss = gkTh * wasteNorm.waveCrest * linerBefore + gkTh * wasteNorm.waveCrest * fluteTh * coef;
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
                const loss = gkTh * wasteNorm.waveCrest * linerBefore + gkTh * wasteNorm.waveCrest * fluteTh * coef;
                if (letter in flute) {
                    flute[letter] += loss;
                }
            }
        }
    }
    // Lớp liner cuối cùng
    const lastLiner = [...layers].reverse().find((l) => l.kind === "liner");
    if (lastLiner) {
        softLiner = gkTh * wasteNorm.waveCrestSoft * (lastLiner.thickness / 1000);
    }
    // Tính hao phí, dao, tổng hao hụt
    const bottom = flute.E + flute.B + flute.C + softLiner;
    const totalLength = runningPlan / numberChild;
    const oneM2WaveCrestSoft = bottom / wasteNorm.waveCrestSoft;
    const haoPhi = wasteNorm.waveCrestSoft > 0
        ? totalLength * oneM2WaveCrestSoft * (wasteNorm.lossInProcess / 100)
        : 0;
    const knife = wasteNorm.waveCrestSoft > 0 ? oneM2WaveCrestSoft * wasteNorm.lossInSheetingAndSlitting : 0;
    const totalLoss = flute.E + flute.B + flute.C + flute.E2 + haoPhi + knife + bottom;
    const roundSmart = (num) => Math.round(num * 100) / 100;
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
const handleCreateBoxPlanning = async ({ order, paperPlan, machineMap, transaction, }) => {
    if (!order.isBox)
        return null;
    const box = order.box;
    const boxPlan = await crud_helper_repository_1.CrudHelper.createData({
        model: planningBox_1.PlanningBox,
        data: {
            planningId: paperPlan.planningId,
            orderId: order.orderId,
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
        transaction,
    });
    const machineTimes = Object.entries(machineMap)
        .filter(([flag]) => boxPlan[flag] === true)
        .map(([_, machineName]) => ({
        planningBoxId: boxPlan.planningBoxId,
        machine: machineName,
        runningPlan: paperPlan.runningPlan,
    }));
    if (machineTimes.length > 0) {
        await planningStatusRepository_1.planningStatusRepository.createPlanningBoxTime(machineTimes, transaction);
    }
};
const syncPlanningOrderToMeili = async ({ planningId, isBox, transaction, }) => {
    const paperToSync = await planningPaperRepository_1.planningPaperRepository.syncPaperFromOrderToMeili({
        planningId,
        transaction,
    });
    if (paperToSync) {
        const flatPaperData = meiliTransformer_1.meiliTransformer.planningPaper(paperToSync);
        await meiliService_1.meiliService.syncOrUpdateMeiliData({
            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
            data: flatPaperData,
            transaction,
        });
        if (isBox) {
            const boxToSync = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxByPlanningId(paperToSync.planningId, transaction);
            if (boxToSync) {
                const flatBoxData = meiliTransformer_1.meiliTransformer.planningBox(boxToSync);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.PLANNING_BOXES,
                    data: flatBoxData,
                    transaction,
                });
            }
        }
    }
};
//helper create paper requirement
const handlePaperRequirements = async ({ planningId, planningData, waveCoeff, runningPlan, length, size, ghepKho, transaction, }) => {
    const isRollMachine = planningData.chooseMachine === "Máy Quấn Cuồn";
    const layerConfigs = [
        { rawCode: planningData.dayReplace, isFlute: false },
        { rawCode: planningData.songEReplace, isFlute: true, fluteLetter: "E" },
        { rawCode: planningData.matEReplace, isFlute: false },
        { rawCode: planningData.songBReplace, isFlute: true, fluteLetter: "B" },
        { rawCode: planningData.matBReplace, isFlute: false },
        { rawCode: planningData.songCReplace, isFlute: true, fluteLetter: "C" },
        { rawCode: planningData.matCReplace, isFlute: false },
        { rawCode: planningData.songE2Replace, isFlute: true, fluteLetter: "E2" },
        { rawCode: planningData.matE2Replace, isFlute: false },
    ].filter((item) => Boolean(item.rawCode));
    const totalLayers = layerConfigs.length;
    let fluteCounter = 0;
    let midCounter = 0;
    let countE = 0;
    let totalRequiredQty = 0;
    const roundSmart = (num) => Math.round(num * 100) / 100;
    // Tính toán định mức từng lớp
    const preparedLayers = layerConfigs.map((layer, idx) => {
        const layerIndex = idx + 1;
        let layerRole;
        let fluteFactor = 1.0;
        let fluteType = null;
        if (layerIndex === 1) {
            layerRole = "BOTTOM";
        }
        else if (layerIndex === totalLayers && !layer.isFlute) {
            layerRole = "TOP";
        }
        else if (layer.isFlute) {
            fluteCounter++;
            layerRole = `FLUTE_${fluteCounter}`;
            fluteType = layer.fluteLetter || null;
        }
        else {
            midCounter++;
            layerRole = `MID_${midCounter}`;
        }
        if (layer.isFlute) {
            if (layer.fluteLetter === "E") {
                fluteFactor = countE === 0 ? waveCoeff.fluteE_1 : waveCoeff.fluteE_2;
                countE++;
            }
            else if (layer.fluteLetter === "E2") {
                fluteFactor = waveCoeff.fluteE_2;
            }
            else if (layer.fluteLetter === "B") {
                fluteFactor = waveCoeff.fluteB;
            }
            else if (layer.fluteLetter === "C") {
                fluteFactor = waveCoeff.fluteC;
            }
        }
        //loại bỏ tiền tố của sóng
        let paperCode = layer.rawCode;
        if (layer.isFlute && layer.fluteLetter) {
            const regex = new RegExp(`^${layer.fluteLetter}`, "i");
            paperCode = paperCode.replace(regex, "");
        }
        // Bóc tách định lượng GSM (VD: "TC120" => 120)
        const gsmMatch = layer.rawCode.match(/\d+$/);
        const weightGsm = gsmMatch ? parseFloat(gsmMatch[0]) : 0;
        // Trọng số định lượng thực tế tính cả hệ số sóng
        const effectiveGsm = weightGsm * fluteFactor;
        return {
            layerIndex,
            layerRole,
            paperCode,
            weightGsm,
            fluteType,
            fluteFactor,
            effectiveGsm,
        };
    });
    // Tổng trọng số định lượng (dùng tính tỷ lệ cho Máy Quấn Cuồn)
    const totalEffectiveGsm = preparedLayers.reduce((sum, l) => sum + l.effectiveGsm, 0);
    // Tính khối lượng định mức theo từng loại máy
    const layersCalculated = preparedLayers.map((layer) => {
        let requiredQty = 0;
        if (isRollMachine) {
            const ratio = totalEffectiveGsm > 0 ? layer.effectiveGsm / totalEffectiveGsm : 0;
            requiredQty = roundSmart(runningPlan * ratio);
        }
        else {
            requiredQty = roundSmart((length * size * runningPlan * layer.weightGsm * layer.fluteFactor) / 10_000_000);
        }
        totalRequiredQty += requiredQty;
        return {
            layerIndex: layer.layerIndex,
            layerRole: layer.layerRole,
            paperCode: layer.paperCode,
            weightGsm: layer.weightGsm,
            fluteType: layer.fluteType,
            fluteFactor: layer.fluteFactor,
            requiredQty,
            availableStock: 0,
            shortageQty: requiredQty,
            isEnoughQty: false,
        };
    });
    totalRequiredQty = roundSmart(totalRequiredQty);
    // Ghi bảng Header
    const paperRequirement = await crud_helper_repository_1.CrudHelper.createData({
        model: paperRequirements_1.PaperRequirements,
        data: { planningId, paperRollWidth: ghepKho, totalRequiredQty, inventoryStatus: "SHORTAGE" },
        transaction,
    });
    // Ghi bảng Detail
    const layersData = layersCalculated.map((layer) => ({
        ...layer,
        requirementId: paperRequirement.requirementId,
    }));
    await crud_helper_repository_1.CrudHelper.bulkCreate({
        model: paper_requirement_layers_1.PaperRequirementLayers,
        data: layersData,
        options: { transaction },
    });
    return { header: paperRequirement, layers: layersData };
};
//# sourceMappingURL=planningStatusService.js.map