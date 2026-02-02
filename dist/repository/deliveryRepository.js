"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRepository = void 0;
const sequelize_1 = require("sequelize");
const planningPaper_1 = require("../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
const order_1 = require("../models/order/order");
const customer_1 = require("../models/customer/customer");
const product_1 = require("../models/product/product");
const user_1 = require("../models/user/user");
const inventory_1 = require("../models/warehouse/inventory");
const planningBox_1 = require("../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const deliveryPlan_1 = require("../models/delivery/deliveryPlan");
const deliveryItem_1 = require("../models/delivery/deliveryItem");
const vehicle_1 = require("../models/admin/vehicle");
const fluteRatio_1 = require("../models/admin/fluteRatio");
exports.deliveryRepository = {
    //================================PLANNING ESTIMATE TIME==================================
    getPlanningEstimateTime: async (dayStart) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: {
                deliveryPlanned: "none",
                dayStart: { [sequelize_1.Op.lte]: dayStart },
                status: { [sequelize_1.Op.notIn]: ["stop", "cancel"] },
            },
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "sortPlanning",
                    "statusRequest",
                    "hasOverFlow",
                    "bottom",
                    "fluteE",
                    "fluteB",
                    "fluteC",
                    "fluteE2",
                    "knife",
                    "totalLoss",
                    "qtyWasteNorm",
                    "chooseMachine",
                    "shiftProduction",
                    "shiftManagement",
                ],
            },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: ["overflowDayStart", "overflowTimeRunning", "status"],
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
                            "canLan",
                            "daoXa",
                            "acreage",
                            "pricePaper",
                            "profit",
                        ],
                    },
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                        { model: user_1.User, attributes: ["fullName"] },
                        { model: inventory_1.Inventory, attributes: ["totalQtyOutbound"] },
                    ],
                },
                {
                    model: planningBox_1.PlanningBox,
                    required: false,
                    attributes: ["planningBoxId"],
                    include: [
                        {
                            model: timeOverflowPlanning_1.timeOverflowPlanning,
                            as: "timeOverFlow",
                            attributes: ["overflowDayStart", "overflowTimeRunning", "status"],
                        },
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            attributes: [
                                "runningPlan",
                                "timeRunning",
                                "dayStart",
                                "qtyProduced",
                                "machine",
                                "status",
                            ],
                            required: false,
                            where: {
                                dayStart: { [sequelize_1.Op.lte]: dayStart },
                                timeRunning: { [sequelize_1.Op.ne]: null },
                            },
                        },
                    ],
                },
            ],
            order: [
                [{ model: order_1.Order, as: "Order" }, { model: customer_1.Customer, as: "Customer" }, "customerName", "ASC"],
            ],
            limit: 300,
        });
    },
    getPaperDeliveryPlanned: async (planningIds, transaction) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: {
                planningId: planningIds,
                deliveryPlanned: "none",
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    //=================================PLANNING DELIVERY=====================================
    getPlanningPendingDelivery: async () => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { deliveryPlanned: "pending" },
            attributes: [
                "planningId",
                "lengthPaperPlanning",
                "sizePaperPLaning",
                "hasBox",
                "deliveryPlanned",
                "orderId",
            ],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box", "volume"],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                    ],
                },
                {
                    model: planningBox_1.PlanningBox,
                    required: false,
                    attributes: ["planningBoxId"],
                },
            ],
        });
    },
    // getDeliveryRequest: async () => {
    //   return await DeliveryRequest.findAll({
    //     where: { status: "requested" },
    //     attributes: ["requestId"],
    //     include: [
    //       { model: User, attributes: ["fullName"] },
    //       {
    //         model: PlanningPaper,
    //         attributes: ["planningId", "lengthPaperPlanning", "sizePaperPLaning"],
    //         include: [
    //           {
    //             model: Order,
    //             attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box"],
    //             include: [
    //               { model: Customer, attributes: ["customerName", "companyName"] },
    //               { model: Product, attributes: ["typeProduct", "productName"] },
    //             ],
    //           },
    //           {
    //             model: PlanningBox,
    //             required: false,
    //             attributes: ["planningBoxId"],
    //           },
    //         ],
    //       },
    //     ],
    //   });
    // },
    findAllFluteRatio: async () => {
        return await fluteRatio_1.FluteRatio.findAll({ attributes: ["fluteName", "ratio"], raw: true });
    },
    getDeliveryPlanByDate: async (deliveryDate) => {
        return await deliveryPlan_1.DeliveryPlan.findOne({
            where: { deliveryDate },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: deliveryItem_1.DeliveryItem,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    include: [{ model: vehicle_1.Vehicle, attributes: ["vehicleName", "licensePlate"] }],
                },
            ],
            order: [["deliveryId", "ASC"]],
        });
    },
    findOneDeliveryPlanByDate: async (deliveryDate, transaction) => {
        return await deliveryPlan_1.DeliveryPlan.findOne({
            where: { deliveryDate: new Date(deliveryDate) },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    getAllBoxByIds: async (boxIds, isRaw) => {
        return await planningBox_1.PlanningBox.findAll({
            where: { planningBoxId: { [sequelize_1.Op.in]: boxIds } },
            attributes: ["planningBoxId", "planningId"],
            raw: isRaw,
        });
    },
    getAllPaperByIds: async (allPlanningIds) => {
        return planningPaper_1.PlanningPaper.findAll({
            where: { planningId: { [sequelize_1.Op.in]: allPlanningIds } },
            attributes: [
                "planningId",
                "lengthPaperPlanning",
                "sizePaperPLaning",
                "deliveryPlanned",
                "orderId",
            ],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box"],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                    ],
                },
            ],
            nest: true,
            raw: true,
        });
    },
    getAllPaperScheduled: async (allPlanningIds) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { planningId: { [sequelize_1.Op.in]: allPlanningIds } },
            attributes: ["planningId"],
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
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
                        "lengthPaperManufacture",
                        "paperSizeManufacture",
                        "quantityManufacture",
                        "dvt",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                        { model: inventory_1.Inventory, attributes: ["qtyInventory"] },
                    ],
                },
            ],
            raw: true,
            nest: true,
        });
    },
    findOrCreateDeliveryPlan: async (deliveryDate, transaction) => {
        return await deliveryPlan_1.DeliveryPlan.findOrCreate({
            where: { deliveryDate: new Date(deliveryDate) },
            include: [{ model: deliveryItem_1.DeliveryItem }],
            transaction,
        });
    },
    destroyItemById: async (itemIds, transaction) => {
        return await deliveryItem_1.DeliveryItem.destroy({
            where: { deliveryItemId: { [sequelize_1.Op.in]: itemIds } },
            transaction,
        });
    },
    updatePlanningPaperById: async ({ planningIds, status, transaction, }) => {
        return await planningPaper_1.PlanningPaper.update({ deliveryPlanned: status }, { where: { planningId: { [sequelize_1.Op.in]: planningIds } }, transaction });
    },
    updateDeliveryItemById: async ({ statusUpdate, whereCondition, transaction, }) => {
        return await deliveryItem_1.DeliveryItem.update({ status: statusUpdate }, { where: whereCondition, transaction });
    },
    bulkUpsert: async (item, transaction) => {
        return await deliveryItem_1.DeliveryItem.bulkCreate(item, {
            updateOnDuplicate: ["vehicleId", "sequence", "note", "status"],
            transaction,
        });
    },
    //=================================SCHEDULE DELIVERY=====================================
    getAllDeliveryPlanByDate: async (deliveryDate, status) => {
        const whereCondition = {
            deliveryDate: new Date(deliveryDate),
        };
        if (status) {
            whereCondition.status = status;
        }
        return await deliveryPlan_1.DeliveryPlan.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            where: whereCondition,
            include: [
                {
                    model: deliveryItem_1.DeliveryItem,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    include: [{ model: vehicle_1.Vehicle, attributes: { exclude: ["createdAt", "updatedAt"] } }],
                },
            ],
        });
    },
    deliveryCount: async (deliveryId, transaction) => {
        return await deliveryItem_1.DeliveryItem.count({
            where: {
                deliveryId,
                status: { [sequelize_1.Op.notIn]: ["completed", "cancelled"] },
            },
            transaction,
        });
    },
    getDeliveryItemByIds: async (itemIds, transaction) => {
        return await deliveryItem_1.DeliveryItem.findAll({
            where: { deliveryItemId: itemIds },
            attributes: ["targetType", "targetId"],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
};
//# sourceMappingURL=deliveryRepository.js.map