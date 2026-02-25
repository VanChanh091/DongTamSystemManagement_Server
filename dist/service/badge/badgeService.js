"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const appError_1 = require("../../utils/appError");
const planningBox_1 = require("../../models/planning/planningBox");
exports.badgeService = {
    //pending order (admin)
    countOrderPending: async () => {
        try {
            const count = await order_1.Order.count({ where: { status: "pending" } });
            return { message: "Count order pending successfully", data: count };
        }
        catch (error) {
            console.error(`Count order pending failed:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
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
            if (error instanceof appError_1.AppError)
                throw error;
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
            if (error instanceof appError_1.AppError)
                throw error;
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
            if (error instanceof appError_1.AppError)
                throw error;
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
            if (error instanceof appError_1.AppError)
                throw error;
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
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=badgeService.js.map