"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = void 0;
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const appError_1 = require("../../utils/appError");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const deliveryItem_1 = require("../../models/delivery/deliveryItem");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const scrapReport_1 = require("../../models/scrap/scrapReport");
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
            const data = await warehouseRepository_1.warehouseRepository.getPaperWaitingChecked();
            const count = data.length;
            return { message: "Count waiting check paper successfully", data: count };
        }
        catch (error) {
            console.error(`Count waiting check paper failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    countWaitingCheckBox: async () => {
        try {
            const data = await warehouseRepository_1.warehouseRepository.getBoxWaitingChecked();
            const count = data.length;
            return { message: "Count waiting check box successfully", data: count };
        }
        catch (error) {
            console.error(`Count waiting check box failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    countWaitingCheckScrapReport: async () => {
        try {
            const count = await scrapReport_1.ScrapReport.count({ where: { status: "pending" } });
            return { message: "Count waiting check scrap report successfully", data: count };
        }
        catch (error) {
            console.error(`Count waiting check scrap report failed:`, error);
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