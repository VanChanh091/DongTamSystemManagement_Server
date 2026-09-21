"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntheticRepository = void 0;
const sequelize_1 = require("sequelize");
const user_1 = require("../../models/user/user");
const order_1 = require("../../models/order/order");
const product_1 = require("../../models/product/product");
const customer_1 = require("../../models/customer/customer");
const planningBox_1 = require("../../models/planning/planningBox");
const planningPaper_1 = require("../../models/planning/planningPaper");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
exports.syntheticRepository = {
    //====================================ORDERS========================================
    getAllOrderByStatus: async ({ page, pageSize, status, allOrders, condition = {}, }) => {
        let statusFilter;
        if (allOrders === "all") {
            // Nếu là "all", ép cứng lấy 2 trạng thái này
            statusFilter = ["accept", "planning", "completed"];
        }
        else {
            statusFilter = Array.isArray(status) ? status : [status];
        }
        const whereCondition = { status: { [sequelize_1.Op.in]: statusFilter }, ...condition };
        const query = {
            where: whereCondition,
            attributes: [
                "orderId",
                "dayReceiveOrder",
                "dateRequestShipping",
                "lengthPaperCustomer",
                "lengthPaperManufacture",
                "paperSizeCustomer",
                "paperSizeManufacture",
                "quantityCustomer",
                "dvt",
                "flute",
                "QC_box",
                "day",
                "matE",
                "matB",
                "matC",
                "matE2",
                "songE",
                "songB",
                "songC",
                "songE2",
                "instructSpecial",
                "pricePaper",
                "totalPrice",
                "totalPriceVAT",
                "volume",
                "status",
                "isBox",
                "isFSC",
                "orderSortValue",
                "statusPriority",
                "price",
                "pricePaper",
                "totalPrice",
                "totalPriceVAT",
                "vat",
                "orderIdCustomer",
            ],
            include: [
                { model: customer_1.Customer, attributes: ["customerName"] },
                { model: product_1.Product, attributes: ["productName"] },
                { model: inventory_1.Inventory, attributes: ["totalQtyOutbound", "qtyInventory", "qtyVariance"] },
                { model: user_1.User, attributes: ["fullName"] },
            ],
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
            query.order = [
                // sort theo orderId
                ["orderSortValue", "DESC"],
                // sort theo accept -> planning | pending -> reject
                ["statusPriority", "DESC"],
            ];
        }
        return await order_1.Order.findAndCountAll(query);
    },
    getPlanningBoxDetail: async (orderId) => {
        return await planningBox_1.PlanningBox.findOne({
            where: { orderId: orderId },
            attributes: ["planningBoxId", "qtyPaper", "orderId"],
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "boxTimes",
                    attributes: ["qtyProduced", "machine", "rpWasteLoss"],
                },
            ],
        });
    },
    //====================================PLANNING========================================
    getAllSyntheticPlanning: async ({ page = 1, pageSize = 20, whereCondition = {}, paginate = true, }) => {
        const query = {
            where: whereCondition,
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "hasBox",
                    "sortPlanning",
                    "statusRequest",
                    "hasOverFlow",
                ],
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
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "canLan",
                        "daoXa",
                        "quantityManufacture",
                        "dvt",
                        "instructSpecial",
                        "chongTham",
                        "orderSortValue",
                        "statusPriority",
                        "isBox",
                        "isFSC",
                        "customerId",
                        "productId",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: product_1.Product, attributes: ["productName", "maKhuon"] },
                        { model: inventory_1.Inventory, attributes: ["totalQtyOutbound"] },
                    ],
                },
            ],
            order: [[{ model: order_1.Order }, "orderSortValue", "ASC"]],
        };
        if (paginate) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await planningPaper_1.PlanningPaper.findAndCountAll(query);
    },
    getSyntheticPlanningDetail: async (planningId) => {
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
        });
    },
    getAllTimeOverflow: async (planningBoxId) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
            where: { planningBoxId: planningBoxId },
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "status",
                    "planningId",
                    "overflowId",
                    "overflowDayStart",
                ],
            },
            raw: true,
        });
    },
    getSyntheticPlanningSearch: async (whereCondition = {}) => {
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
    exportExcelSyntheticPlanning: async ({ whereCondition = {} }) => {
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
//# sourceMappingURL=syntheticRepository.js.map