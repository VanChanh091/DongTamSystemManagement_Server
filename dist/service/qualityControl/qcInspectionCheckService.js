"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcInspectionService = void 0;
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const criteriaBoxCheck_1 = require("../../models/admin/criteriaCheck/criteriaBoxCheck");
const criteriaPaperCheck_1 = require("../../models/admin/criteriaCheck/criteriaPaperCheck");
const planningPaper_1 = require("../../models/planning/planningPaper");
const qcInspectionBox_1 = require("../../models/qualityControl/qcInspection/qcInspectionBox");
const qcInspectionPaper_1 = require("../../models/qualityControl/qcInspection/qcInspectionPaper");
const qcRepository_1 = require("../../repository/qcRepository");
const appError_1 = require("../../utils/appError");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const sequelize_1 = require("sequelize");
const { paper } = cacheKey_1.CacheKey.qcInspection;
const devEnvironment = process.env.NODE_ENV !== "production";
exports.qcInspectionService = {
    //===============================INSPECTION PAPER===================================
    getAllQcInspectionPaper: async ({ page, pageSize, machine, }) => {
        try {
            const cacheKey = paper.page(machine, page);
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: qcInspectionPaper_1.QcInspectionPaper }], "inspectionPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("inspectionPaper");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Inspection Paper from Redis");
                    return {
                        ...JSON.parse(cachedData),
                        message: `get all Qc Inspection Paper from cache successfully`,
                    };
                }
            }
            const options = qcRepository_1.qcRepository.buildInspectionPaperOptions({ page, pageSize, machine });
            const { rows, count } = await qcInspectionPaper_1.QcInspectionPaper.findAndCountAll(options);
            const responseData = {
                message: "get all Qc Inspection Paper successfully",
                data: rows,
                totalInspecPaper: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("get all Qc Inspection Paper failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getInspectionPaperErr: async (planningId) => {
        try {
            const inspectionPaper = await qcInspectionPaper_1.QcInspectionPaper.findOne({
                attributes: { exclude: ["createdAt", "updatedAt", "timeInspection", "checkedBy"] },
                where: { planningId },
                order: [["inspecPaperId", "DESC"]],
            });
            return { message: "get inspection paper errors successfully", data: inspectionPaper };
        }
        catch (error) {
            console.error("get inspection paper errors failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    checkingInspectionPaper: async ({ req, checking, errProgress, planningId, username, machine, userId, note, }) => {
        try {
            return (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const dbData = {
                    planningId: planningId,
                    timeInspection: new Date(),
                    checkedBy: username,
                    userId: userId,
                    note: note || null,
                };
                if (checking) {
                    for (const [key, value] of Object.entries(checking))
                        dbData[key] = value;
                }
                //lay criteria check
                const requiredCriteria = await criteriaPaperCheck_1.CriteriaPaperCheck.findAll({
                    attributes: ["criteriaPaperCode"],
                    transaction,
                });
                //so sánh với criteria check
                const requiredCriteriaCodes = requiredCriteria.map((c) => c.criteriaPaperCode);
                const missingCriteria = requiredCriteriaCodes.filter((code) => !(code in errProgress));
                if (missingCriteria.length > 0) {
                    throw appError_1.AppError.BadRequest(`Missing required criteria: ${missingCriteria.join(", ")}`, "MISSING_REQUIRED_CRITERIA");
                }
                dbData.checkList = errProgress;
                await qcInspectionPaper_1.QcInspectionPaper.create(dbData, { transaction });
                //lọc các tiêu chí bị lỗi
                const failedCriteria = Object.entries(errProgress)
                    .filter(([_, value]) => value === false)
                    .map(([key]) => key);
                const currentStatusCheck = failedCriteria.length > 0 ? "failed" : "passed";
                await planningPaper_1.PlanningPaper.update({ statusCheck: currentStatusCheck }, { where: { planningId }, transaction });
                const planning = await planningPaper_1.PlanningPaper.findOne({
                    attributes: ["orderId"],
                    where: { planningId },
                    transaction,
                });
                //socket
                if (currentStatusCheck === "failed") {
                    const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
                    const item = {
                        from: "QC",
                        message: `Đơn hàng: ${planning?.orderId} đang bị lỗi tại ${machine}`,
                    };
                    req.io?.to(roomName).emit("qc-inspection-paper", item);
                }
                return { message: "Create Qc Inspection Paper successfully" };
            });
        }
        catch (error) {
            console.error("Error checking inspection paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //paper or box
    getReportQcInspectionSummary: async ({ machine, startDate, endDate, isPaper, user, }) => {
        const { userId, role } = user;
        try {
            let whereConditions = [];
            // console.log(`start: ${startDate} - endDate: ${endDate}`);
            if (startDate && endDate) {
                const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").format("YYYY-MM-DD HH:mm:ss");
                const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").format("YYYY-MM-DD HH:mm:ss");
                // console.log(`formatStart: ${startTimestamp} - formatEnd: ${endTimestamp}`);
                whereConditions.push({
                    timeInspection: {
                        [sequelize_1.Op.between]: [startTimestamp, endTimestamp],
                    },
                });
            }
            const isAdminOrManager = role && ["admin", "manager"].includes(role.toLowerCase());
            if (userId && !isAdminOrManager) {
                whereConditions.push({ userId });
            }
            const isPaperType = isPaper === "paper";
            const summaryMap = {};
            const criteriaList = isPaperType
                ? (await criteriaPaperCheck_1.CriteriaPaperCheck.findAll({
                    attributes: [
                        ["criteriaPaperCode", "code"],
                        ["criteriaPaperName", "name"],
                    ],
                    raw: true,
                })).map((item) => ({ code: item.code, name: item.name }))
                : (await criteriaBoxCheck_1.CriteriaBoxCheck.findAll({
                    where: { machine },
                    attributes: [
                        ["criteriaBoxCode", "code"],
                        ["criteriaBoxName", "name"],
                    ],
                    raw: true,
                })).map((item) => ({ code: item.code, name: item.name }));
            // Khởi tạo danh sách với count = 0
            for (const item of criteriaList) {
                summaryMap[item.code] = { name: item.name, count: 0 };
            }
            // Danh sách kiểm tra từ DB
            const listInspection = isPaperType
                ? await qcRepository_1.qcRepository.getChecklistInspectionPaper({ whereConditions, machine })
                : await qcRepository_1.qcRepository.getChecklistInspectionBox({ whereConditions, machine });
            for (const item of listInspection) {
                const checkList = item.checkList;
                if (!checkList || typeof checkList !== "object")
                    continue;
                for (const [key, value] of Object.entries(checkList)) {
                    if (!value) {
                        summaryMap[key]
                            ? (summaryMap[key].count += 1)
                            : (summaryMap[key] = { name: key, count: 1 });
                    }
                }
            }
            const summaryData = Object.entries(summaryMap).map(([key, item]) => ({
                key,
                name: item.name,
                count: item.count,
            }));
            return { message: "Summarized inspection errors successfully", data: summaryData };
        }
        catch (error) {
            console.error("Error summing errors in inspection:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //===============================INSPECTION BOX===================================
    getAllQcInspectionBox: async ({ page, pageSize, machine, }) => {
        try {
            // const cacheKey = paper.page(machine, page);
            // const { isChanged } = await CacheManager.check(
            //   [{ model: QcInspectionPaper }],
            //   "inspectionPaper",
            // );
            // if (isChanged) {
            //   await CacheManager.clear("inspectionPaper");
            // } else {
            //   const cachedData = await redisCache.get(cacheKey);
            //   if (cachedData) {
            //     if (devEnvironment) console.log("✅ Data Inspection Box from Redis");
            //     return {
            //       ...JSON.parse(cachedData),
            //       message: `get all Qc Inspection Box from cache successfully`,
            //     };
            //   }
            // }
            const options = qcRepository_1.qcRepository.buildInspectionBoxOptions({ page, pageSize, machine });
            const { rows, count } = await qcInspectionBox_1.QcInspectionBox.findAndCountAll(options);
            const responseData = {
                message: "get all Qc Inspection Box successfully",
                data: rows,
                totalInspecPaper: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("get all Qc Inspection Box failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getInspectionBoxErr: async (planningBoxId, machine) => {
        try {
            const boxTime = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
                attributes: ["boxTimeId"],
                where: { planningBoxId, machine },
            });
            if (!boxTime) {
                throw appError_1.AppError.NotFound(`Planning Box with ID ${planningBoxId} not found`, "PLANNING_BOX_NOT_FOUND");
            }
            const inspectionBox = await qcInspectionBox_1.QcInspectionBox.findOne({
                attributes: { exclude: ["createdAt", "updatedAt", "timeInspection", "checkedBy"] },
                where: { boxTimeId: boxTime.boxTimeId },
                order: [["inspecBoxId", "DESC"]],
            });
            return { message: "get inspection box errors successfully", data: inspectionBox };
        }
        catch (error) {
            console.error("get inspection box errors failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    checkingInspectionBox: async ({ req, machine, planningBoxId, username, errProgress, userId, note, }) => {
        try {
            return (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const dbData = {
                    timeInspection: new Date(),
                    checkedBy: username,
                    userId: userId,
                    note: note || null,
                };
                const boxTime = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
                    attributes: ["boxTimeId"],
                    where: { planningBoxId, machine },
                    transaction,
                });
                if (!boxTime) {
                    throw appError_1.AppError.NotFound(`Planning Box with ID ${planningBoxId} not found`, "PLANNING_BOX_NOT_FOUND");
                }
                const boxTimeId = boxTime.boxTimeId;
                dbData.boxTimeId = boxTimeId;
                //lay criteria check
                const requiredCriteria = await criteriaBoxCheck_1.CriteriaBoxCheck.findAll({
                    attributes: ["criteriaBoxCode"],
                    where: { machine },
                    transaction,
                });
                //so sánh với criteria check
                const requiredCriteriaCodes = requiredCriteria.map((c) => c.criteriaBoxCode);
                const missingCriteria = requiredCriteriaCodes.filter((code) => !(code in errProgress));
                if (missingCriteria.length > 0) {
                    throw appError_1.AppError.BadRequest(`Missing required criteria: ${missingCriteria.join(", ")}`, "MISSING_REQUIRED_CRITERIA");
                }
                dbData.checkList = errProgress;
                await qcInspectionBox_1.QcInspectionBox.create(dbData, { transaction });
                //lọc các tiêu chí bị lỗi
                const failedCriteria = Object.entries(errProgress)
                    .filter(([_, value]) => value === false)
                    .map(([key]) => key);
                const currentStatusCheck = failedCriteria.length > 0 ? "failed" : "passed";
                await planningBoxMachineTime_1.PlanningBoxTime.update({ statusCheck: currentStatusCheck }, { where: { boxTimeId }, transaction });
                //socket
                if (currentStatusCheck === "failed") {
                    const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
                    const item = {
                        from: "QC",
                        message: `Có đơn hàng sản xuất đang bị lỗi tại ${machine}`,
                    };
                    req.io?.to(roomName).emit("qc-inspection-box", item);
                }
                return { message: "Create Qc Inspection Box successfully" };
            });
        }
        catch (error) {
            console.error("Error checking inspection box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=qcInspectionCheckService.js.map