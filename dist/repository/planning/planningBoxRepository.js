"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningBoxRepository = void 0;
const sequelize_1 = require("sequelize");
const planningBox_1 = require("../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const box_1 = require("../../models/order/box");
exports.planningBoxRepository = {
    getAllPlanningBox: async ({ whereCondition = {}, machine, }) => {
        return await planningBox_1.PlanningBox.findAll({
            where: whereCondition,
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
                    where: { machine: machine },
                    as: "boxTimes",
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "allBoxTimes",
                    where: { machine: { [sequelize_1.Op.ne]: machine } },
                    required: false,
                    attributes: {
                        exclude: [
                            "timeRunning",
                            "dayStart",
                            "dayCompleted",
                            "wasteBox",
                            "shiftManagement",
                            "status",
                            "sortPlanning",
                            "createdAt",
                            "updatedAt",
                            "rpWasteLoss",
                        ],
                    },
                },
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    required: false,
                    where: { machine: machine },
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "numberChild",
                        "dateRequestShipping",
                        "customerId",
                        "productId",
                        "quantityCustomer",
                    ],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                },
            ],
        });
    },
    getPlanningBoxSearch: async (whereCondition = {}) => {
        return await planningBox_1.PlanningBox.findAll({
            attributes: ["planningBoxId", "orderId", "planningId"],
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: whereCondition,
                    as: "boxTimes",
                    attributes: ["machine", "status", "planningBoxId"],
                },
                {
                    model: order_1.Order,
                    attributes: ["QC_box"],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                    ],
                },
            ],
        });
    },
    getBoxsByOrderId: async (orderId) => {
        return await planningBox_1.PlanningBox.findAll({
            where: {
                orderId: {
                    [sequelize_1.Op.like]: `%${orderId}%`,
                },
            },
        });
    },
    getBoxsById: async ({ planningBoxIds, machine, options = {}, }) => {
        const { attributes, include } = options;
        const ids = Array.isArray(planningBoxIds) ? planningBoxIds : [planningBoxIds];
        return await planningBoxMachineTime_1.PlanningBoxTime.findAll({
            attributes,
            include,
            where: { planningBoxId: { [sequelize_1.Op.in]: ids }, machine },
        });
    },
    getBoxesByUpdateIndex: async (updateIndex, machine, transaction) => {
        return await planningBox_1.PlanningBox.findAll({
            where: { planningBoxId: updateIndex.map((i) => i.planningBoxId) },
            include: [
                { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "boxTimes",
                    where: { machine, sortPlanning: updateIndex.map((i) => i.sortPlanning) },
                },
                {
                    model: order_1.Order,
                    include: [{ model: box_1.Box, as: "box", attributes: ["inMatTruoc", "inMatSau"] }],
                },
            ],
            order: [[{ model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
            transaction,
        });
    },
    getTimeOverflowBox: async (machine, transaction) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            where: { machine, status: "complete" },
                            attributes: ["status", "machine"],
                            required: true,
                        },
                    ],
                },
            ],
            order: [
                ["overflowDayStart", "DESC"],
                ["overflowTimeRunning", "DESC"],
            ],
            transaction,
        });
    },
    syncPlanningBoxToMeili: async ({ whereCondition, transaction, }) => {
        return await planningBox_1.PlanningBox.findAll({
            where: whereCondition,
            attributes: ["planningBoxId"],
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "boxTimes",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: ["orderId", "QC_box"],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
            transaction,
        });
    },
    syncPlanningBoxByPlanningId: async (planningId, transaction) => {
        return await planningBox_1.PlanningBox.findOne({
            where: { planningId },
            attributes: ["planningBoxId"],
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "boxTimes",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: ["orderId", "QC_box"],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
            transaction,
        });
    },
};
//# sourceMappingURL=planningBoxRepository.js.map