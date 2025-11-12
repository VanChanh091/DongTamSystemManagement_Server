"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDataBox = exports.getAllDataPaper = void 0;
const planningPaper_1 = require("../../models/planning/planningPaper");
const planningBox_1 = require("../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const box_1 = require("../../models/order/box");
const product_1 = require("../../models/product/product");
const user_1 = require("../../models/user/user");
const sequelize_1 = require("sequelize");
const redisCache_1 = __importDefault(require("../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//=============================PAPER===================================
const getAllDataPaper = async (req, res) => {
    const { page, pageSize, refresh = false } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const cacheKey = `data:paper:all:${currentPage}`;
    try {
        if (refresh === "true") {
            await redisCache_1.default.del(cacheKey);
        }
        const cachedData = await redisCache_1.default.get(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const planningArray = parsed?.data ?? [];
            if (planningArray.length > 0) {
                if (devEnvironment)
                    console.log("✅ Get Planning from cache");
                return res.status(200).json({
                    message: "Get PlanningPaper from cache",
                    data: planningArray,
                    totalPlannings: parsed.totalPlannings,
                    totalPages: parsed.totalPages,
                    currentPage: parsed.currentPage,
                });
            }
        }
        const whereCondition = {
            status: "complete",
            dayCompleted: { [sequelize_1.Op.ne]: null },
        };
        const totalPlannings = await planningPaper_1.PlanningPaper.count({ where: whereCondition });
        const totalPages = Math.ceil(totalPlannings / currentPageSize);
        const offset = (currentPage - 1) * currentPageSize;
        const data = await planningPaper_1.PlanningPaper.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: planningBox_1.PlanningBox,
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
                            "runningPlan",
                            "day",
                            "matE",
                            "matB",
                            "matC",
                            "songE",
                            "songB",
                            "songC",
                            "songE2",
                            "length",
                            "size",
                            "hasOverFlow",
                        ],
                    },
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            where: whereCondition,
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                        {
                            model: timeOverflowPlanning_1.timeOverflowPlanning,
                            as: "timeOverFlow",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                },
                {
                    model: order_1.Order,
                    attributes: {
                        exclude: [
                            "rejectReason",
                            "createdAt",
                            "updatedAt",
                            "day",
                            "matE",
                            "matB",
                            "matC",
                            "songE",
                            "songB",
                            "songC",
                            "songE2",
                            "status",
                        ],
                    },
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                        {
                            model: product_1.Product,
                            attributes: ["typeProduct", "productName", "maKhuon"],
                        },
                        {
                            model: user_1.User,
                            attributes: ["fullName"],
                        },
                    ],
                },
            ],
            order: [["sortPlanning", "ASC"]],
            offset: offset,
            limit: currentPageSize,
        });
        const responseData = {
            message: "get all data paper from db",
            data,
            totalPlannings,
            totalPages,
            currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error add Report Production:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getAllDataPaper = getAllDataPaper;
//==============================BOX====================================
const getAllDataBox = async (req, res) => {
    const { page = 1, pageSize = 20, refresh = false } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const cacheKey = `data:box:all:${currentPage}`;
    try {
        if (refresh === "true") {
            await redisCache_1.default.del(cacheKey);
        }
        const cachedData = await redisCache_1.default.get(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const planningArray = parsed?.data ?? [];
            if (planningArray.length > 0) {
                if (devEnvironment)
                    console.log("✅ Get PlanningBox from cache");
                return res.status(200).json({
                    message: "Get Order from cache",
                    data: planningArray,
                    totalPlannings: parsed.totalPlannings,
                    totalPages: parsed.totalPages,
                    currentPage: parsed.currentPage,
                });
            }
        }
        // Điều kiện chỉ lấy đơn đã hoàn thành
        const whereCondition = {
            status: "complete",
            dayCompleted: { [sequelize_1.Op.ne]: null },
        };
        // Lấy tất cả PlanningBox có công đoạn hoàn thành
        const plannings = await planningBox_1.PlanningBox.findAll({
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
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "boxTimes",
                    where: whereCondition,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: {
                        exclude: ["rejectReason", "createdAt", "updatedAt"],
                    },
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                        {
                            model: product_1.Product,
                            attributes: ["typeProduct", "productName", "maKhuon"],
                        },
                        {
                            model: user_1.User,
                            attributes: ["fullName"],
                        },
                    ],
                },
            ],
            order: [["planningBoxId", "ASC"]],
        });
        // Flatten data: mỗi công đoạn = 1 dòng
        const flattened = plannings.flatMap((planning) => {
            const plainPlanning = planning.toJSON();
            return plainPlanning.boxTimes.map((step) => {
                const row = {
                    ...plainPlanning,
                    boxTime: step,
                    timeOverFlow: plainPlanning.timeOverFlow.filter((ov) => ov.machine === step.machine),
                };
                // Xóa boxTimes vì không cần nữa
                delete row.boxTimes;
                return row;
            });
        });
        // Pagination theo công đoạn
        const totalPlannings = flattened.length;
        const totalPages = Math.ceil(totalPlannings / currentPageSize);
        const offset = (currentPage - 1) * currentPageSize;
        const paginated = flattened.slice(offset, offset + currentPageSize);
        const responseData = {
            message: "get all data box from db",
            data: paginated,
            totalPlannings,
            totalPages,
            currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error getAllDataBox:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getAllDataBox = getAllDataBox;
//# sourceMappingURL=dashboard.js.map