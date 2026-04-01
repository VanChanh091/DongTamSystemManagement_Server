"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const appError_1 = require("../../utils/appError");
const planningBox_1 = require("../../models/planning/planningBox");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const deliveryItem_1 = require("../../models/delivery/deliveryItem");
exports.badgeService = {
    //pending order (admin)
    countOrderPending: async () => {
        try {
            const count = await order_1.Order.count({ where: { status: "pending" } });
            return { message: "Count order pending successfully", data: count };
        }
        catch (error) {
            console.error(`Count order pending failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //order reject
    countOrderRejected: async (userId) => {
        try {
            const count = await order_1.Order.count({ where: { status: "reject", userId: userId } });
            return { message: "Count order rejected successfully", data: count };
        }
        catch (error) {
            console.error(`Count order rejected failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //order pending planning
    countOrderPendingPlanning: async () => {
        try {
            const count = await order_1.Order.count({ where: { status: "accept" } });
            return { message: "Count order pending planning successfully", data: count };
        }
        catch (error) {
            console.error(`Count order pending planning failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //planning stop
    countPlanningStop: async () => {
        try {
            const count = await planningPaper_1.PlanningPaper.count({ where: { status: "stop" } });
            return { message: "Count planning stop successfully", data: count };
        }
        catch (error) {
            console.error(`Count planning stop failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //waiting check paper & box
    countWaitingCheckPaper: async () => {
        try {
            const count = await planningPaper_1.PlanningPaper.count({
                where: { hasBox: false, statusRequest: { [sequelize_1.Op.in]: ["requested", "inbounded"] } },
            });
            return { message: "Count waiting check paper successfully", data: count };
        }
        catch (error) {
            console.error(`Count waiting check paper failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    countWaitingCheckBox: async () => {
        try {
            const count = await planningBox_1.PlanningBox.count({
                where: { statusRequest: { [sequelize_1.Op.in]: ["requested", "inbounded"] } },
            });
            return { message: "Count waiting check box successfully", data: count };
        }
        catch (error) {
            console.error(`Count waiting check box failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //delivery request
    countDeliveryRequest: async () => {
        try {
            const count = await deliveryRequest_1.DeliveryRequest.count({ where: { status: "requested" } });
            return { message: "Count delivery request successfully", data: count };
        }
        catch (error) {
            console.error(`Count delivery request failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //prepare goods
    countRequestPrepareGoods: async () => {
        try {
            const count = await deliveryItem_1.DeliveryItem.count({ where: { status: "requested" } });
            return { message: "Count prepare goods successfully", data: count };
        }
        catch (error) {
            console.error(`Count prepare goods failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=badgeService.js.map