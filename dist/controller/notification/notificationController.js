"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequestChanging = exports.requestChangeInfoOrder = exports.confirmRequestChanging = exports.getMyNofitications = void 0;
const notificationService_1 = require("../../service/notification/notificationService");
const orderService_notification_1 = require("../../service/notification/orderService.notification");
const planningService_notification_1 = require("../../service/notification/planningService.notification");
//=======================NOTIFICATION=======================
const getMyNofitications = async (req, res, next) => {
    try {
        const response = await notificationService_1.notificationService.getMyNofitications(req);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyNofitications = getMyNofitications;
const confirmRequestChanging = async (req, res, next) => {
    const { notificationId } = req.query;
    try {
        const response = await notificationService_1.notificationService.confirmRequestChanging({
            notificationId: Number(notificationId),
            userId: req.user.userId,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmRequestChanging = confirmRequestChanging;
//=========================ORDER============================
const requestChangeInfoOrder = async (req, res, next) => {
    const { receiverId } = req.query;
    try {
        const response = await orderService_notification_1.OrderServiceNotification.requestChangeInfoOrder({
            req,
            senderId: req.user.userId,
            receiverId: Number(receiverId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.requestChangeInfoOrder = requestChangeInfoOrder;
//========================PLANNING===========================
const handleRequestChanging = async (req, res, next) => {
    const { notificationId, action } = req.query;
    try {
        const response = await planningService_notification_1.planningServiceNotification.handleRequestChangeInfoOrder({
            req,
            notificationId: Number(notificationId),
            senderId: req.user.userId,
            action,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handleRequestChanging = handleRequestChanging;
//# sourceMappingURL=notificationController.js.map