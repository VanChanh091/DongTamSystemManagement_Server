"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderServiceNotification = void 0;
const user_1 = require("../../models/user/user");
const requestType_1 = require("./requestType");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const notificationRepository_1 = require("../../repository/notificationRepository");
exports.OrderServiceNotification = {
    //notification
    requestChangeInfoOrder: async ({ req, senderId, receiverId, }) => {
        const { orderId, requestType, newDeliveryDate, reason } = req.body;
        // console.log(
        //   `body: ${JSON.stringify(req.body)}, senderId: ${senderId}, receiverId: ${receiverId}`,
        // );
        const config = requestType_1.REQUEST_CONFIG[requestType];
        if (!config) {
            throw appError_1.AppError.BadRequest("Loại yêu cầu không hợp lệ", "INVALID_REQUEST_TYPE");
        }
        if (!orderId) {
            throw appError_1.AppError.BadRequest("Mã đơn hàng không được để trống", "ORDER_ID_REQUIRED");
        }
        if (requestType === "ORDER_CHANGE_DATE" && !newDeliveryDate) {
            throw appError_1.AppError.BadRequest("Ngày giao hàng mới không được để trống", "NEW_DELIVERY_DATE_REQUIRED");
        }
        const payload = {
            orderId,
            reason,
            action: "REQUEST",
        };
        if (requestType === "ORDER_CHANGE_DATE") {
            payload.newDeliveryDate = newDeliveryDate;
        }
        let createdNotifData = null;
        try {
            await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // lấy thông tin người nhận
                const receiver = await user_1.User.findOne({ where: { userId: receiverId }, transaction });
                if (!receiver) {
                    throw appError_1.AppError.NotFound("Không tìm thấy thông tin người nhận", "USER_NOT_FOUND");
                }
                const newNotif = await notificationRepository_1.notificationRepository.createNotification({
                    title: config.titleCreate(),
                    type: requestType,
                    targetType: "user",
                    senderId: senderId,
                    senderName: req.user.fullName,
                    senderDept: req.user.department,
                    status: "pending",
                    payload,
                    transaction,
                });
                await notificationRepository_1.notificationRepository.createUserNotification({
                    notificationId: newNotif.notificationId,
                    receiverId: receiverId,
                    receiverDept: receiver?.department || null,
                    transaction,
                });
                createdNotifData = newNotif;
            });
            //socket
            // req.io?.to(`user-${newNotif.receiver_id}`).emit("new-notification", newNotif);
            if (createdNotifData) {
                req.io?.to(`user-${receiverId}`).emit("new-notification", createdNotifData);
            }
            const successMessage = requestType === "ORDER_CANCEL"
                ? "Đã gửi yêu cầu hủy đơn hàng thành công."
                : "Đã gửi yêu cầu thay đổi ngày giao hàng thành công.";
            return { message: successMessage };
        }
        catch (error) {
            console.error("Error in request change info order:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=orderService.notification.js.map