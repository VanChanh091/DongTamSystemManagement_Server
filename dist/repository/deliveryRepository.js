"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRepository = void 0;
const user_1 = require("../models/user/user");
const sequelize_1 = require("sequelize");
const order_1 = require("../models/order/order");
const vehicle_1 = require("../models/admin/vehicle");
const product_1 = require("../models/product/product");
const customer_1 = require("../models/customer/customer");
const planningBox_1 = require("../models/planning/planningBox");
const deliveryPlan_1 = require("../models/delivery/deliveryPlan");
const planningPaper_1 = require("../models/planning/planningPaper");
const inventory_1 = require("../models/warehouse/inventory/inventory");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const deliveryItem_1 = require("../models/delivery/deliveryItem");
const deliveryRequest_1 = require("../models/delivery/deliveryRequest");
const outboundDetail_1 = require("../models/warehouse/outbound/outboundDetail");
exports.deliveryRepository = {
    //================================PLANNING ESTIMATE TIME==================================
    buildPlanningEstimateOptions: ({ whereCondition, userId, all = "false", dayStart, isSearch, }) => {
        const queryOptions = {
            where: whereCondition,
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
                "qtyProduced",
                "hasBox",
                "timeRunning",
                "orderId",
                "status",
                "deliveryPlanned",
            ],
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "dateRequestShipping",
                        "QC_box",
                        "paperSizeManufacture",
                        "lengthPaperManufacture",
                        "quantityManufacture",
                        "dvt",
                        "isBox",
                        "volume",
                        "instructSpecial",
                        "orderIdCustomer",
                        "note",
                        "customerId",
                        "productId",
                        "userId",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: product_1.Product, attributes: ["productName"] },
                        { model: user_1.User, where: all === "true" ? {} : { userId }, attributes: ["fullName"] },
                        { model: inventory_1.Inventory, attributes: ["qtyInventory", "totalQtyOutbound"] },
                    ],
                },
                {
                    model: planningBox_1.PlanningBox,
                    required: false,
                    attributes: ["planningBoxId"],
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            attributes: ["timeRunning", "dayStart", "qtyProduced", "machine"],
                            required: false,
                            where: {
                                dayStart: { [sequelize_1.Op.lte]: dayStart },
                                timeRunning: { [sequelize_1.Op.ne]: null },
                            },
                        },
                    ],
                },
            ],
        };
        if (!isSearch) {
            queryOptions.order = [
                [{ model: order_1.Order, as: "Order" }, { model: customer_1.Customer, as: "Customer" }, "customerName", "ASC"],
            ];
            queryOptions.limit = 600;
        }
        return queryOptions;
    },
    getPlanningEstimateTime: ({ dayStart, userId, all, }) => {
        return planningPaper_1.PlanningPaper.findAll(exports.deliveryRepository.buildPlanningEstimateOptions({
            whereCondition: {
                dayStart: { [sequelize_1.Op.lte]: dayStart },
                status: { [sequelize_1.Op.notIn]: ["stop", "cancel"] },
                deliveryPlanned: { [sequelize_1.Op.ne]: "delivered" },
            },
            userId,
            all,
            dayStart,
            isSearch: false,
        }));
    },
    getPlanningEstimateByField: async ({ planningIds, dayStart, all, }) => {
        return await planningPaper_1.PlanningPaper.findAll(exports.deliveryRepository.buildPlanningEstimateOptions({
            whereCondition: {
                planningId: { [sequelize_1.Op.in]: planningIds },
                dayStart: { [sequelize_1.Op.lte]: dayStart },
            },
            dayStart,
            all,
            isSearch: true,
        }));
    },
    getPaperWaitingRegister: async (planningId, transaction) => {
        return await planningPaper_1.PlanningPaper.findOne({
            where: { planningId, deliveryPlanned: { [sequelize_1.Op.ne]: "delivered" } },
            include: [
                {
                    model: order_1.Order,
                    attributes: ["quantityCustomer", "lengthPaperCustomer", "paperSizeCustomer", "flute"],
                },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    getPaperWaitingClose: async (planningId, transaction) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { planningId, deliveryPlanned: { [sequelize_1.Op.ne]: "delivered" } },
            include: [
                {
                    model: order_1.Order,
                    attributes: ["quantityCustomer", "lengthPaperCustomer", "paperSizeCustomer", "flute"],
                },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    //=================================PLANNING DELIVERY=====================================
    getDeliveryRequest: async ({ isSearch, requestId, }) => {
        const whereCondition = { status: "requested" };
        if (requestId && isSearch === "true") {
            whereCondition.requestId = { [sequelize_1.Op.in]: requestId };
        }
        return await deliveryRequest_1.DeliveryRequest.findAll({
            where: whereCondition,
            attributes: ["requestId", "qtyRegistered", "volume", "note", "status", "planningId"],
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    required: true,
                    attributes: [
                        "planningId",
                        "lengthPaperPlanning",
                        "sizePaperPLaning",
                        "dayStart",
                        "timeRunning",
                    ],
                    include: [
                        {
                            model: order_1.Order,
                            required: true,
                            attributes: [
                                "orderId",
                                "quantityCustomer",
                                "dayReceiveOrder",
                                "flute",
                                "QC_box",
                                "orderSortValue",
                            ],
                            include: [
                                { model: customer_1.Customer, required: true, attributes: ["customerName"] },
                                { model: product_1.Product, required: true, attributes: ["productName"] },
                                { model: inventory_1.Inventory, attributes: ["qtyInventory", "totalQtyOutbound"] },
                            ],
                        },
                    ],
                },
            ],
            order: [
                [planningPaper_1.PlanningPaper, order_1.Order, customer_1.Customer, "customerName", "ASC"],
                [planningPaper_1.PlanningPaper, order_1.Order, "orderSortValue", "ASC"],
            ],
        });
    },
    getDeliveryPlanByDate: async (deliveryDate) => {
        return await deliveryPlan_1.DeliveryPlan.findOne({
            where: { deliveryDate },
            attributes: ["deliveryId", "deliveryDate"],
            include: [
                {
                    model: deliveryItem_1.DeliveryItem,
                    attributes: {
                        exclude: ["createdAt", "updatedAt", "recipient", "dayRequested", "dayCompleted"],
                    },
                    include: [
                        {
                            model: deliveryRequest_1.DeliveryRequest,
                            attributes: ["requestId", "volume", "qtyRegistered", "note"],
                            include: [
                                {
                                    model: planningPaper_1.PlanningPaper,
                                    attributes: [
                                        "planningId",
                                        "lengthPaperPlanning",
                                        "sizePaperPLaning",
                                        "dayStart",
                                        "timeRunning",
                                    ],
                                    include: [
                                        {
                                            model: order_1.Order,
                                            attributes: [
                                                "orderId",
                                                "dayReceiveOrder",
                                                "flute",
                                                "QC_box",
                                                "orderSortValue",
                                            ],
                                            include: [
                                                { model: customer_1.Customer, attributes: ["customerName"] },
                                                { model: product_1.Product, attributes: ["productName"] },
                                                { model: inventory_1.Inventory, attributes: ["qtyInventory", "totalQtyOutbound"] },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        { model: vehicle_1.Vehicle, attributes: ["vehicleName", "licensePlate"] },
                        { model: outboundDetail_1.OutboundDetail, attributes: ["outboundQty"] },
                    ],
                },
            ],
            order: [[deliveryItem_1.DeliveryItem, "idxOrder", "ASC"]],
        });
    },
    getDeliveryPlanByIds: async ({ requestId, transaction, }) => {
        return await deliveryRequest_1.DeliveryRequest.findAll({
            where: { requestId, status: { [sequelize_1.Op.ne]: "scheduled" } },
            attributes: ["requestId", "status", "planningId"],
            include: [{ model: planningPaper_1.PlanningPaper, attributes: ["planningId", "deliveryPlanned"] }],
            transaction,
        });
    },
    findOneDeliveryPlanByDate: async (deliveryDate, transaction) => {
        return await deliveryPlan_1.DeliveryPlan.findOne({
            where: { deliveryDate: new Date(deliveryDate) },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    findOrCreateDeliveryPlan: async (deliveryDate, transaction) => {
        return await deliveryPlan_1.DeliveryPlan.findOrCreate({
            where: { deliveryDate: new Date(deliveryDate) },
            include: [
                {
                    model: deliveryItem_1.DeliveryItem,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    include: [{ model: deliveryRequest_1.DeliveryRequest, attributes: ["requestId", "planningId"] }],
                },
            ],
            transaction,
        });
    },
    destroyItemById: async (itemIds, transaction) => {
        return await deliveryItem_1.DeliveryItem.destroy({
            where: { deliveryItemId: { [sequelize_1.Op.in]: itemIds } },
            transaction,
        });
    },
    updateDeliveryItemById: async ({ statusUpdate, whereCondition, transaction, }) => {
        return await deliveryItem_1.DeliveryItem.update({ status: statusUpdate }, { where: whereCondition, transaction });
    },
    updateRequestStatus: async (requestIds, status, transaction) => {
        return await deliveryRequest_1.DeliveryRequest.update({ status }, {
            where: { requestId: requestIds },
            transaction,
        });
    },
    bulkUpsert: async (item, transaction) => {
        return await deliveryItem_1.DeliveryItem.bulkCreate(item, {
            updateOnDuplicate: ["deliveryId", "vehicleId", "sequence", "status", "idxOrder"],
            transaction,
        });
    },
    //------------------------MEILISEARCH-----------------------------
    buildMeiliDeliveryRequestOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: ["requestId", "status"],
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["planningId"],
                    include: [
                        {
                            model: order_1.Order,
                            attributes: ["orderId"],
                            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                        },
                    ],
                },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            transaction,
        };
        return queryOptions;
    },
    syncDeliveryRequestForMeili: async (requestId, transaction) => {
        return await deliveryRequest_1.DeliveryRequest.findOne(exports.deliveryRepository.buildMeiliDeliveryRequestOptions({
            whereCondition: { requestId },
            transaction,
        }));
    },
    syncManyDeliveryRequestForMeili: async (requestIds, transaction) => {
        return await deliveryRequest_1.DeliveryRequest.findAll(exports.deliveryRepository.buildMeiliDeliveryRequestOptions({
            whereCondition: { requestId: { [sequelize_1.Op.in]: requestIds } },
            transaction,
        }));
    },
    syncAllDeliveryRequestForMeili: async ({ whereCondition }) => {
        return await deliveryRequest_1.DeliveryRequest.findAll(exports.deliveryRepository.buildMeiliDeliveryRequestOptions({ whereCondition }));
    },
    //=================================SCHEDULE DELIVERY=====================================
    getAllDeliveryPlanByDate: async ({ deliveryDate, status, itemStatus, }) => {
        const whereCondition = { deliveryDate: new Date(deliveryDate) };
        if (status) {
            whereCondition.status = { [sequelize_1.Op.in]: Array.isArray(status) ? status : [status] };
        }
        const itemWhereCondition = {};
        if (itemStatus) {
            itemWhereCondition.status = { [sequelize_1.Op.in]: itemStatus };
        }
        return await deliveryPlan_1.DeliveryPlan.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            where: whereCondition,
            order: [
                [deliveryItem_1.DeliveryItem, "sequence", "ASC"],
                [deliveryItem_1.DeliveryItem, "idxOrder", "ASC"],
            ],
            include: [
                {
                    model: deliveryItem_1.DeliveryItem,
                    where: Object.keys(itemWhereCondition).length > 0 ? itemWhereCondition : undefined,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    include: [
                        {
                            model: deliveryRequest_1.DeliveryRequest,
                            attributes: { exclude: ["status", "userId", "planningId", "createdAt", "updatedAt"] },
                            include: [
                                {
                                    model: planningPaper_1.PlanningPaper,
                                    attributes: ["planningId", "hasBox"],
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
                                                "quantityCustomer",
                                                "lengthPaperCustomer",
                                                "paperSizeCustomer",
                                                "lengthPaperManufacture",
                                                "paperSizeManufacture",
                                                "dvt",
                                                "orderIdCustomer",
                                                "isFSC",
                                            ],
                                            include: [
                                                { model: customer_1.Customer, attributes: ["customerName"] },
                                                { model: product_1.Product, attributes: ["productName"] },
                                                { model: inventory_1.Inventory, attributes: ["totalQtyOutbound"] },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        { model: outboundDetail_1.OutboundDetail, attributes: ["outboundQty"] },
                        { model: vehicle_1.Vehicle, attributes: ["vehicleId", "vehicleName", "vehicleHouse"] },
                    ],
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
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    getDeliveryItemToUpdateStatus: async (itemIds, transaction) => {
        return await deliveryItem_1.DeliveryItem.findAll({
            where: { deliveryItemId: { [sequelize_1.Op.in]: itemIds } },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: deliveryRequest_1.DeliveryRequest,
                    attributes: ["requestId"],
                    include: [
                        {
                            model: planningPaper_1.PlanningPaper,
                            attributes: ["planningId", "hasBox", "orderId"],
                            include: [{ model: planningBox_1.PlanningBox, attributes: ["planningBoxId"] }],
                        },
                    ],
                },
            ],
            transaction,
        });
    },
    //start auto complete
    getDeliveryItemsById: async (deliveryItemId) => {
        return await deliveryItem_1.DeliveryItem.findOne({
            where: { deliveryItemId, status: { [sequelize_1.Op.notIn]: ["cancelled", "completed"] } },
            attributes: { exclude: ["createdAt", "updatedAt", "sequence", "idxOrder"] },
            include: [
                {
                    model: deliveryRequest_1.DeliveryRequest,
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt", "status", "userId", "volume"] },
                    include: [
                        {
                            model: planningPaper_1.PlanningPaper,
                            attributes: ["planningId", "orderId"],
                            required: true,
                            include: [
                                {
                                    model: order_1.Order,
                                    required: true,
                                    attributes: [
                                        "orderId",
                                        "dayReceiveOrder",
                                        "lengthPaperManufacture",
                                        "paperSizeManufacture",
                                    ],
                                    include: [{ model: customer_1.Customer, attributes: ["companyName"] }],
                                },
                            ],
                        },
                    ],
                },
                { model: vehicle_1.Vehicle, attributes: ["vehicleName"] },
            ],
        });
    },
    searchOrderIdInDeliveryItem: async (keyword) => {
        return await deliveryItem_1.DeliveryItem.findAll({
            where: { status: { [sequelize_1.Op.notIn]: ["cancelled", "completed"] } },
            attributes: ["deliveryItemId"],
            include: [
                { model: deliveryPlan_1.DeliveryPlan, attributes: ["deliveryDate"] },
                {
                    model: deliveryRequest_1.DeliveryRequest,
                    required: true,
                    attributes: ["requestId"],
                    include: [
                        {
                            model: planningPaper_1.PlanningPaper,
                            attributes: ["planningId", "orderId"],
                            required: true,
                            include: [
                                {
                                    model: order_1.Order,
                                    where: { orderId: { [sequelize_1.Op.startsWith]: keyword } },
                                    required: true,
                                    attributes: [
                                        "orderId",
                                        "dayReceiveOrder",
                                        "lengthPaperManufacture",
                                        "paperSizeManufacture",
                                    ],
                                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    },
    //end auto complete
};
//# sourceMappingURL=deliveryRepository.js.map