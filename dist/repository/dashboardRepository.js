"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRepository = void 0;
const customer_1 = require("../models/customer/customer");
const order_1 = require("../models/order/order");
const planningBox_1 = require("../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const planningPaper_1 = require("../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
const product_1 = require("../models/product/product");
const user_1 = require("../models/user/user");
exports.dashboardRepository = {
    getDbPlanningCount: async () => {
        return await planningPaper_1.PlanningPaper.count();
    },
    getAllDbPlanning: async ({ page = 1, pageSize = 20, whereCondition = {}, paginate = true, }) => {
        const query = {
            where: whereCondition,
            attributes: {
                exclude: ["createdAt", "updatedAt", "status", "hasBox", "sortPlanning"],
            },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "machine",
                            "status",
                            "planningId",
                            "planningBoxId",
                            "overflowId",
                        ],
                    },
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
                            "matE2",
                            "matB",
                            "matC",
                            "songE",
                            "songB",
                            "songC",
                            "songE2",
                            "status",
                            "lengthPaperCustomer",
                            "paperSizeCustomer",
                            "quantityCustomer",
                            "lengthPaperManufacture",
                            "paperSizeManufacture",
                            "numberChild",
                            "isBox",
                        ],
                    },
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName", "maKhuon"] },
                        { model: user_1.User, attributes: ["fullName"] },
                    ],
                },
            ],
        };
        if (paginate) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        const rawPapers = await planningPaper_1.PlanningPaper.findAll(query);
        return rawPapers;
    },
    getDBPlanningDetail: async (planningId) => {
        return await planningPaper_1.PlanningPaper.findByPk(planningId, {
            attributes: ["planningId", "orderId"],
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    attributes: ["planningBoxId", "qtyPaper", "hasOverFlow", "orderId", "planningId"],
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "boxTimeId", "status", "sortPlanning"],
                            },
                        },
                    ],
                },
            ],
            // order: [["sortPlanning", "ASC"]],
        });
    },
    getDbPlanningSearch: async (whereCondition = {}) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: whereCondition,
            attributes: ["planningId", "orderId", "chooseMachine", "ghepKho"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["flute"],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: user_1.User, attributes: ["fullName"] },
                    ],
                },
            ],
        });
    },
    getAllTimeOverflow: async (planningBoxId) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
            where: { planningBoxId: planningBoxId },
            attributes: {
                exclude: ["createdAt", "updatedAt", "status", "planningId", "overflowId"],
            },
            raw: true,
        });
    },
    exportExcelDbPlanning: async ({ whereCondition = {} }) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "machine",
                            "status",
                            "planningId",
                            "planningBoxId",
                            "overflowId",
                        ],
                    },
                },
                {
                    model: planningBox_1.PlanningBox,
                    attributes: ["planningBoxId", "qtyPaper", "hasOverFlow", "orderId", "planningId"],
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "boxTimeId", "status", "sortPlanning"],
                            },
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
                            "matE2",
                            "matB",
                            "matC",
                            "songE",
                            "songB",
                            "songC",
                            "songE2",
                            "status",
                            "lengthPaperCustomer",
                            "paperSizeCustomer",
                            "quantityCustomer",
                            "lengthPaperManufacture",
                            "paperSizeManufacture",
                            "numberChild",
                            "isBox",
                        ],
                    },
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName", "maKhuon"] },
                        { model: user_1.User, attributes: ["fullName"] },
                    ],
                },
            ],
        });
    },
};
//# sourceMappingURL=dashboardRepository.js.map