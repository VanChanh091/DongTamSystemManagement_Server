"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countDebtDeduction = exports.countRequestPrepareGoods = exports.countDeliveryRequest = exports.countWaitingCheck = exports.countPlanningStop = exports.countOrderPendingPlanning = exports.countOrderPending = void 0;
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const scrapReport_1 = require("../../models/scrap/scrapReport");
const deliveryItem_1 = require("../../models/delivery/deliveryItem");
const planningPaper_1 = require("../../models/planning/planningPaper");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const debtDeductionRequest_1 = require("../../models/debt/debtDeductionRequest");
//pending order
const countOrderPending = async (req, res, next) => {
    try {
        const response = await order_1.Order.count({ where: { status: "pending" } });
        return res.status(201).json({ message: "Count order pending successfully", data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countOrderPending = countOrderPending;
//order pending planning
const countOrderPendingPlanning = async (req, res, next) => {
    try {
        const response = await order_1.Order.count({ where: { status: "accept" } });
        return res
            .status(201)
            .json({ message: "Count order pending planning successfully", data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countOrderPendingPlanning = countOrderPendingPlanning;
//planning stop
const countPlanningStop = async (req, res, next) => {
    try {
        const response = await planningPaper_1.PlanningPaper.count({ where: { status: "stop" } });
        return res.status(201).json({ message: "Count planning stop successfully", data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countPlanningStop = countPlanningStop;
//waiting check paper & box
const countWaitingCheck = async (req, res, next) => {
    const { type } = req.query;
    try {
        let response;
        if (type === "paper") {
            const data = await warehouseRepository_1.warehouseRepository.getPaperWaitingChecked();
            response = data.length;
        }
        else if (type === "box") {
            const data = await warehouseRepository_1.warehouseRepository.getBoxWaitingChecked();
            response = data.length;
        }
        else if (type === "scrap") {
            response = await scrapReport_1.ScrapReport.count({ where: { status: "pending" } });
        }
        else {
            throw appError_1.AppError.BadRequest("Invalid type query parameter. Must be 'paper', 'box', or 'scrap'.");
        }
        return res
            .status(201)
            .json({ message: `Count waiting check ${type} successfully`, data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countWaitingCheck = countWaitingCheck;
//delivery request
const countDeliveryRequest = async (req, res, next) => {
    try {
        const response = await deliveryRequest_1.DeliveryRequest.count({ where: { status: "requested" } });
        return res.status(201).json({ message: "Count delivery request successfully", data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countDeliveryRequest = countDeliveryRequest;
//prepare goods
const countRequestPrepareGoods = async (req, res, next) => {
    try {
        const response = await deliveryItem_1.DeliveryItem.count({ where: { status: "requested" } });
        return res.status(201).json({ message: "Count prepare goods successfully", data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countRequestPrepareGoods = countRequestPrepareGoods;
const countDebtDeduction = async (req, res, next) => {
    try {
        const response = await debtDeductionRequest_1.DebtDeductionRequest.count({ where: { status: "pending" } });
        return res.status(201).json({ message: "Count debt deduction successfully", data: response });
    }
    catch (error) {
        next(error);
    }
};
exports.countDebtDeduction = countDebtDeduction;
//# sourceMappingURL=badgeController.js.map