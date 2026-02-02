"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manufactureRepository = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../models/order/order");
const planningPaper_1 = require("../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
const customer_1 = require("../models/customer/customer");
const box_1 = require("../models/order/box");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const planningBox_1 = require("../models/planning/planningBox");
exports.manufactureRepository = {
    //====================================PAPER========================================
    getManufacturePaper: async (machine) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { chooseMachine: machine, dayStart: { [sequelize_1.Op.ne]: null } },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: { exclude: ["createdAt", "updatedAt", "status"] },
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
                        "dateRequestShipping",
                        "instructSpecial",
                        "isBox",
                        "customerId",
                        "productId",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
                        },
                    ],
                },
            ],
            order: [["sortPlanning", "ASC"]],
        });
    },
    getPapersById: async (planningId, transaction) => {
        return await planningPaper_1.PlanningPaper.findOne({
            where: { planningId },
            include: [
                { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                { model: order_1.Order, attributes: ["quantityCustomer", "pricePaper"] },
            ],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
    },
    getPapersByOrderId: async (orderId, transaction) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { orderId: orderId },
            attributes: ["qtyProduced"],
            transaction,
        });
    },
    //====================================BOX========================================
    getManufactureBox: async (machine) => {
        return await planningBox_1.PlanningBox.findAll({
            attributes: {
                exclude: [
                    "dayStart",
                    "dayCompleted",
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
                    where: { machine: machine, dayStart: { [sequelize_1.Op.ne]: null } },
                    as: "boxTimes",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "allBoxTimes",
                    where: { machine: { [sequelize_1.Op.ne]: machine } },
                    attributes: ["boxTimeId", "qtyProduced", "machine"],
                },
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    required: false,
                    where: { machine: machine },
                    attributes: { exclude: ["createdAt", "updatedAt", "status"] },
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
                            attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
                        },
                    ],
                },
            ],
            order: [[{ model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
        });
    },
    getBoxById: async (planningBoxId, machine, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.findOne({
            where: { planningBoxId: planningBoxId, machine: machine },
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    include: [
                        { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                        { model: order_1.Order, attributes: ["quantityCustomer"] },
                    ],
                },
            ],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
    },
    getAllBoxTimeById: async (planningBoxId, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.findAll({
            where: { planningBoxId },
            transaction,
        });
    },
    updatePlanningBoxTime: async (planningBoxId, machine, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.update({ status: "planning" }, {
            where: {
                machine,
                status: "producing",
                planningBoxId: { [sequelize_1.Op.ne]: planningBoxId },
            },
            transaction,
        });
    },
};
//# sourceMappingURL=manufactureRepository.js.map