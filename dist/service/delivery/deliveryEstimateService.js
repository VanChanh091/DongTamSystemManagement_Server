"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryEstimateService = void 0;
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const labelFields_1 = require("../../assets/labelFields");
const planningBox_1 = require("../../models/planning/planningBox");
const qcSession_1 = require("../../models/qualityControl/qcSession");
const planningPaper_1 = require("../../models/planning/planningPaper");
const deliveryScheduleService_1 = require("./deliveryScheduleService");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const deliveryRepository_1 = require("../../repository/deliveryRepository");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const orderHelpers_1 = require("../../utils/helper/modelHelper/orderHelpers");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const planningPaperRepository_1 = require("../../repository/planning/planningPaperRepository");
exports.deliveryEstimateService = {
    getPlanningEstimateTime: async ({ page = 1, pageSize = 20, dayStart, estimateTime, userId, all = "false", }) => {
        // const cacheKey = estimate.page(page);
        try {
            // const { isChanged } = await CacheManager.check(PlanningPaper, "estimate");
            // if (isChanged) {
            //   await CacheManager.clear("estimate");
            // } else {
            //   const cachedData = await redisCache.get(cacheKey);
            //   if (cachedData) {
            //     if (devEnvironment) console.log("✅ get planning estimate time from cache");
            //     return { ...JSON.parse(cachedData), message: "get all planning estimate from cache" };
            //   }
            // }
            const [endHour, endMinute] = estimateTime.split(":").map(Number);
            if (isNaN(endHour) ||
                isNaN(endMinute) ||
                endHour < 0 ||
                endHour > 23 ||
                endMinute < 0 ||
                endMinute > 59) {
                throw appError_1.AppError.BadRequest("estimateTime không hợp lệ", "INVALID_ESTIMATE_TIME");
            }
            const plannings = await deliveryRepository_1.deliveryRepository.getPlanningEstimateTime({ dayStart, userId, all });
            //filter
            const filtered = exports.deliveryEstimateService.filterPlanningEstimateTime({
                plannings,
                dayStart,
                estimateTime,
            });
            //PAGING DATA
            const totalPlannings = filtered.length;
            const totalPages = Math.ceil(totalPlannings / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageData = filtered.slice(startIndex, endIndex);
            const responseData = {
                message: "get all data paper from db",
                data: pageData,
                totalPlannings,
                totalPages,
                currentPage: page,
            };
            // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get planning estimate time failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getPlanningEstimateByField: async ({ page = 1, pageSize = 20, dayStart, estimateTime, userId, all = "false", field, keyword, }) => {
        const index = meilisearch_connect_1.meiliClient.index("planningPapers");
        try {
            const validFields = ["orderId", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            let filters = [`deliveryPlanned != "delivered"`, `status NOT IN ["stop", "cancel"]`];
            if (all !== "true") {
                filters.push(`userId = ${userId}`);
            }
            // console.log(`filter: ${filters.join(" AND ")}`);
            // console.log(`keyword: ${keyword}`);
            const searchResult = await index.search(keyword, {
                filter: filters.join(" AND "),
                attributesToRetrieve: ["planningId"],
                attributesToSearchOn: [field],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSizes
            });
            const planningIds = searchResult.hits.map((hit) => hit.planningId);
            // console.log(`length planningIds: ${planningIds.length}`);
            // console.log(`planningIds: ${JSON.stringify(planningIds)}`);
            if (planningIds.length === 0) {
                return {
                    message: "No planning papers found",
                    data: [],
                    totalPlannings: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            const plannings = await deliveryRepository_1.deliveryRepository.getPlanningEstimateByField({
                planningIds,
                dayStart,
                all: "true",
            });
            const filtered = exports.deliveryEstimateService.filterPlanningEstimateTime({
                plannings,
                dayStart,
                estimateTime,
            });
            const data = planningIds
                .map((id) => filtered.find((p) => p.planningId === id))
                .filter(Boolean);
            const finalData = data.map((p) => {
                const plain = typeof p.get === "function" ? p.get({ plain: true }) : p;
                delete plain.PlanningBox;
                return plain;
            });
            return {
                message: `Search by ${field} from Meilisearch & DB`,
                data: finalData,
                totalPlannings: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error(`Failed to get planning estimate by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    filterPlanningEstimateTime: ({ plannings, dayStart, estimateTime, }) => {
        //helper đổi giờ thành phút để so sánh
        const getProductionMinutes = (timeStr) => {
            if (!timeStr)
                return 0;
            const [h, m] = timeStr.split(":").map(Number);
            const totalMinutesFromMidnight = h * 60 + m;
            // Nếu giờ >= 6:00 sáng -> Thuộc cùng ngày dương lịch
            if (totalMinutesFromMidnight >= 360) {
                return totalMinutesFromMidnight - 360;
            }
            // Nếu giờ < 6:00 sáng (từ 00:00 đến 05:59) -> Thuộc ngày dương lịch tiếp theo
            return totalMinutesFromMidnight + 1440 - 360;
        };
        const estimateMinutes = getProductionMinutes(estimateTime);
        return plannings.filter((paper) => {
            if (paper.status === "complete")
                return true;
            //check day
            if (!paper.dayStart)
                return false;
            const paperDate = new Date(paper.dayStart).setHours(0, 0, 0, 0);
            const targetDate = new Date(dayStart).setHours(0, 0, 0, 0);
            //if paper date < target date → show
            if (paperDate < targetDate)
                return true;
            // KHÔNG CÓ BOX → so paper
            if (!paper.hasBox) {
                if (!paper.timeRunning)
                    return false;
                // console.log(`time paper: ${paperMinutes}`);
                // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);
                const paperMinutes = getProductionMinutes(paper.timeRunning);
                return paperMinutes <= estimateMinutes;
            }
            else {
                // CÓ BOX → so theo BOX
                const boxTimes = paper.PlanningBox?.boxTimes ?? [];
                if (boxTimes.length === 0)
                    return false;
                // Tìm Box có phút sản xuất lớn nhất
                const latestBoxMinutes = Math.max(...boxTimes.map((t) => getProductionMinutes(t.timeRunning)));
                // console.log(`latest time box: ${latestBoxMinutes}`);
                // console.log(`compare box: ${latestBoxMinutes <= estimateMinutes}`);
                return latestBoxMinutes <= estimateMinutes;
            }
        });
    },
    registerQtyDelivery: async ({ planningId, userId, qtyRegistered, note, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!planningId || !qtyRegistered || qtyRegistered <= 0) {
                    throw appError_1.AppError.BadRequest("missing parameters", "MISSING_PARAMETERS");
                }
                const planning = await deliveryRepository_1.deliveryRepository.getPaperWaitingRegister(planningId, transaction);
                if (!planning) {
                    throw appError_1.AppError.BadRequest("Planning không tồn tại", "PLANNING_NOT_FOUND");
                }
                //calculate volume
                const volume = await (0, orderHelpers_1.calculateVolume)({
                    flute: planning.Order.flute ?? "",
                    lengthCustomer: planning.Order.lengthPaperCustomer,
                    sizeCustomer: planning.Order.paperSizeCustomer,
                    quantity: qtyRegistered,
                    transaction,
                });
                const request = await deliveryRequest_1.DeliveryRequest.create({
                    planningId,
                    userId,
                    qtyRegistered,
                    volume,
                    note,
                    orderId: planning.orderId,
                    status: "requested",
                }, { transaction });
                // Cập nhật trạng thái PlanningPaper
                await planningPaper_1.PlanningPaper.update({ deliveryPlanned: "pending" }, { where: { planningId }, transaction });
                //--------------------MEILISEARCH-----------------------
                const requetsCreated = await deliveryRepository_1.deliveryRepository.syncDeliveryRequestForMeili(request.requestId, transaction);
                const planningForMeili = await planningPaperRepository_1.planningPaperRepository.syncPaperFromOrderToMeili({
                    planningId,
                    transaction,
                });
                if (requetsCreated) {
                    const flattenData = meiliTransformer_1.meiliTransformer.deliveryRequest(requetsCreated);
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.DELIVERY_REQUEST,
                        data: flattenData,
                        transaction,
                    });
                    if (planningForMeili) {
                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                            data: { planningId: planningForMeili.planningId, deliveryPlanned: "pending" },
                            transaction,
                            isUpdate: true,
                        });
                    }
                }
                return { message: "Xác nhận đăng ký giao hàng thành công" };
            });
        }
        catch (error) {
            console.error("❌ confirm ready delivery planning failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    closePlanning: async ({ planningIds, isPaper = true, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const idArray = Array.isArray(planningIds) ? planningIds : [planningIds];
                // Lấy dữ liệu Planning
                let papers = [];
                let boxes = [];
                if (isPaper) {
                    papers = await planningPaper_1.PlanningPaper.findAll({
                        where: { planningId: idArray },
                        transaction,
                    });
                }
                else {
                    boxes = await planningBox_1.PlanningBox.findAll({
                        where: { planningId: idArray },
                        include: [
                            {
                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                as: "boxTimes",
                                attributes: ["qtyProduced", "machine"],
                            },
                        ],
                        transaction,
                    });
                }
                const records = isPaper ? papers : boxes;
                if (records.length === 0) {
                    throw appError_1.AppError.BadRequest("Không tìm thấy dữ liệu để đóng", "PLANNING_NOT_FOUND");
                }
                // Nếu là Paper: check theo planningId
                // Nếu là Box: check theo planningBoxId (PK của bảng Box)
                const checkKey = isPaper ? "planningId" : "planningBoxId";
                const targetIds = records.map((r) => r[checkKey]);
                // Kiểm tra tổng Inbound từ Warehouse
                const inboundSums = await warehouseRepository_1.warehouseRepository.getInboundSumByPlanning(checkKey, targetIds);
                const inboundMap = new Map(inboundSums.map((item) => [item[checkKey], Number(item.totalInbound) || 0]));
                // Validation
                const orderIds = new Set(); // Dùng Set để tránh trùng lặp ID
                for (const record of records) {
                    const totalInbound = inboundMap.get(record[checkKey]) || 0;
                    const qtyProduced = record.qtyProduced || 0;
                    const orderId = record.orderId;
                    if (orderId)
                        orderIds.add(orderId);
                    // Kiểm tra đã sản xuất chưa
                    if (isPaper) {
                        if (qtyProduced === 0) {
                            throw appError_1.AppError.BadRequest(`Không thể đóng đơn hàng chưa sản xuất: ${orderId}`, "CANNOT_CLOSE_EMPTY_PAPER");
                        }
                    }
                    else {
                        const stages = record.boxTimes || [];
                        if (stages.length === 0) {
                            throw appError_1.AppError.BadRequest(`Đơn hàng ${orderId} có công đoạn chưa có công đoạn sản xuất`, "NO_STAGES_FOUND");
                        }
                        for (const stage of stages) {
                            if ((stage.qtyProduced || 0) <= 0) {
                                throw appError_1.AppError.BadRequest(`Đơn ${orderId}: Công đoạn ${stage.machine} chưa có sản lượng sản xuất.`, "STAGE_NOT_PRODUCED");
                            }
                        }
                    }
                    // Kiểm tra đã có nhập kho chưa
                    if (totalInbound <= 0) {
                        throw appError_1.AppError.BadRequest(`Đơn hàng: ${orderId} chưa được nhập kho.`, "NO_INBOUND_HISTORY");
                    }
                }
                // cập nhật trạng thái (FINALIZED)
                const query = { where: { planningId: planningIds }, transaction };
                if (isPaper) {
                    await planningPaper_1.PlanningPaper.update({ statusRequest: "finalize", deliveryPlanned: "delivered" }, query);
                }
                else {
                    await planningBox_1.PlanningBox.update({ statusRequest: "finalize" }, query);
                    // Logic Master-Detail: Update Paper cha
                    await planningPaper_1.PlanningPaper.update({ statusRequest: "finalize", deliveryPlanned: "delivered" }, query);
                }
                // Kết thúc session QC
                await qcSession_1.QcSession.update({ status: "finalized" }, { where: { [checkKey]: targetIds }, transaction });
                if (orderIds.size > 0) {
                    const listOrderIds = Array.from(orderIds);
                    await order_1.Order.update({ status: "completed" }, { where: { orderId: listOrderIds }, transaction });
                    //--------------------MEILISEARCH-----------------------
                    await deliveryScheduleService_1.deliveryScheduleService._syncOrderForMeili(listOrderIds, transaction);
                    const papers = await planningPaperRepository_1.planningPaperRepository.syncAllPaperToMeili({
                        whereCondition: { planningId: { [sequelize_1.Op.in]: idArray } },
                        transaction,
                    });
                    const flattenData = papers.map(meiliTransformer_1.meiliTransformer.planningPaper);
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                        data: flattenData,
                        transaction,
                    });
                }
                return {
                    message: `Đóng đơn chờ giao thành công`,
                    affectedIds: idArray,
                };
            });
        }
        catch (error) {
            console.error("❌ Close planning failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=deliveryEstimateService.js.map