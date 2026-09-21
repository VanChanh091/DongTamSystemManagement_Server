"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningPaperRepository = void 0;
const box_1 = require("../../models/order/box");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const planningBox_1 = require("../../models/planning/planningBox");
const deliveryItem_1 = require("../../models/delivery/deliveryItem");
const planningPaper_1 = require("../../models/planning/planningPaper");
const sequelize_1 = require("sequelize");
const outboundDetail_1 = require("../../models/warehouse/outbound/outboundDetail");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
exports.planningPaperRepository = {
    getPlanningPaper: async ({ page = 1, pageSize = 20, whereCondition, paginate = false, }) => {
        const query = {
            where: whereCondition,
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
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "dateRequestShipping",
                        "flute",
                        "QC_box",
                        "canLan",
                        "daoXa",
                        "matE2",
                        "quantityManufacture",
                        "instructSpecial",
                        "dvt",
                        "isBox",
                        "isFSC",
                        "chongTham",
                        "orderIdCustomer",
                        "orderSortValue",
                        "statusPriority",
                        "customerId",
                        "productId",
                        "userId",
                    ],
                    include: [{ model: customer_1.Customer, attributes: ["customerName", "companyName"] }],
                },
            ],
        };
        if (paginate) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await planningPaper_1.PlanningPaper.findAndCountAll(query);
    },
    planningPaperTotals: async (whereCondition) => {
        const result = await planningPaper_1.PlanningPaper.findAll({
            where: { ...whereCondition, totalPrice: { [sequelize_1.Op.gt]: 0 } },
            attributes: [[sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("totalPrice")), "totalPrice"]],
            raw: true,
        });
        return result[0];
    },
    getPapersByOrderId: async (orderId) => {
        return await planningPaper_1.PlanningPaper.findAll({
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
    },
    getPapersById: async ({ planningIds, options = {}, transaction, }) => {
        const { attributes, include } = options;
        return await planningPaper_1.PlanningPaper.findAll({
            where: { planningId: { [sequelize_1.Op.in]: planningIds } },
            attributes,
            include,
            transaction,
        });
    },
    getBoxByPlanningId: async (paperId, transaction) => {
        return planningBox_1.PlanningBox.findAll({
            where: { planningId: paperId },
            transaction,
        });
    },
    getPapersByUpdateIndex: async (updateIndex, transaction) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { planningId: updateIndex.map((i) => i.planningId) },
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "qtyProduced",
                    "totalPrice",
                    "bottom",
                    "fluteE",
                    "fluteB",
                    "fluteC",
                    "fluteE2",
                    "knife",
                    "totalLoss",
                    "qtyWasteNorm",
                    "shiftProduction",
                    "shiftManagement",
                    "note",
                    "statusRequest",
                    "deliveryPlanned",
                    "hasBox",
                ],
            },
            include: [{ model: order_1.Order }, { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" }],
            order: [["sortPlanning", "ASC"]],
            transaction,
        });
    },
    getTimeOverflowPaper: async (machine, transaction) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
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
    },
    getPaperToExportFile: async (machine) => {
        return planningPaper_1.PlanningPaper.findAll({
            where: {
                chooseMachine: machine,
                status: { [sequelize_1.Op.notIn]: ["complete", "stop", "cancel"] },
                statusRequest: { [sequelize_1.Op.ne]: "delivered" },
                sortPlanning: { [sequelize_1.Op.ne]: null },
                //qtyProduced < quantityManufacture
                [sequelize_1.Op.and]: [
                    sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn("COALESCE", sequelize_1.Sequelize.col("qtyProduced"), 0), "<", sequelize_1.Sequelize.col("Order.quantityManufacture")),
                ],
            },
            attributes: [
                "planningId",
                "dayStart",
                "dayReplace",
                "matEReplace",
                "matBReplace",
                "matCReplace",
                "matE2Replace",
                "songEReplace",
                "songBReplace",
                "songCReplace",
                "songE2Replace",
                "lengthPaperPlanning",
                "sizePaperPLaning",
                "numberChild",
                "ghepKho",
                "qtyProduced",
                "runningPlan",
                "totalPrice",
                "sortPlanning",
            ],
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "flute",
                        "dateRequestShipping",
                        "quantityManufacture",
                        "instructSpecial",
                    ],
                    required: true,
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
        });
    },
    countObDetailByPlanningId: async (planningId, transaction) => {
        return await deliveryRequest_1.DeliveryRequest.count({
            where: { planningId: planningId },
            include: [
                {
                    model: deliveryItem_1.DeliveryItem,
                    required: true,
                    include: [
                        {
                            model: outboundDetail_1.OutboundDetail,
                            required: true,
                        },
                    ],
                },
            ],
            distinct: true, // Đảm bảo đếm chính xác số lượng Request riêng biệt theo planningId
            transaction,
        });
    },
    //------------------------MEILISEARCH-----------------------------
    buildMeiliPlanningOptions: ({ whereCondition = {}, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: ["planningId", "ghepKho", "chooseMachine", "status", "deliveryPlanned"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId", "userId"],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
            transaction,
        };
        return queryOptions;
    },
    syncAllPaperToMeili: async ({ whereCondition, transaction, }) => {
        return await planningPaper_1.PlanningPaper.findAll(exports.planningPaperRepository.buildMeiliPlanningOptions({ whereCondition, transaction }));
    },
    syncPaperFromOrderToMeili: async ({ planningId, transaction, }) => {
        return await planningPaper_1.PlanningPaper.findOne(exports.planningPaperRepository.buildMeiliPlanningOptions({
            whereCondition: { planningId, deliveryPlanned: { [sequelize_1.Op.ne]: "delivered" } },
            transaction,
        }));
    },
};
//# sourceMappingURL=planningPaperRepository.js.map