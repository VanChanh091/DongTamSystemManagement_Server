"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtDeductionService = void 0;
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const debtDeductionRepository_1 = require("../../repository/debtDeductionRepository");
const debtRepository_1 = require("../../repository/debtRepository");
const debtManagementService_1 = require("./debtManagementService");
const customer_1 = require("../../models/customer/customer");
const user_1 = require("../../models/user/user");
const notification_1 = require("../../models/notification/notification");
const userNotifications_1 = require("../../models/notification/userNotifications");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const telegramSendAlert_1 = require("../../utils/telegram/telegramSendAlert");
const debtDeductionRequest_1 = require("../../models/debt/debtDeductionRequest");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const requestType_1 = require("../notification/requestType");
const socket_1 = require("../../utils/socket/socket");
exports.debtDeductionService = {
    getDebtDeductionRequests: async ({ page, pageSize, status, currentUser, targetUserId, customerId, }) => {
        try {
            const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
            let filterUserId;
            if (isAdminOrManager) {
                filterUserId = targetUserId;
            }
            else {
                filterUserId = currentUser.userId;
            }
            // const cacheKey = paper.all(machine, page);
            // const { isChanged } = await CacheManager.check(ReportPlanningPaper, "reportPaper");
            // if (isChanged) {
            //   await CacheManager.clear("reportPaper");
            // } else {
            //   const cachedData = await redisCache.get(cacheKey);
            //   if (cachedData) {
            //     if (devEnvironment) console.log("✅ Data Report Planning Paper from Redis");
            //     const parsed = JSON.parse(cachedData);
            //     return { ...parsed, message: "Get all report planning paper from cache" };
            //   }
            // }
            const queryOptions = debtDeductionRepository_1.debtDeductionRepository.buildDebtDeductionOptions({
                page,
                pageSize,
                status,
                filterUserId,
                customerId,
            });
            const { rows, count } = await debtDeductionRequest_1.DebtDeductionRequest.findAndCountAll(queryOptions);
            const totalPages = Math.ceil(count / pageSize);
            if (rows.length === 0) {
                return {
                    message: "No debt deduction requests found",
                    data: [],
                    totalPapers: count,
                    totalPages,
                    currentPage: page,
                };
            }
            const responseData = {
                message: "Lấy danh sách yêu cầu cấn trừ nợ thành công",
                data: rows,
                total: count,
                totalPages,
                currentPage: page,
            };
            //  await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Error in getRequests:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createRequest: async ({ currentUser, customerId, amountRequested, paymentMethod, }) => {
        try {
            if (!amountRequested || amountRequested <= 0) {
                throw appError_1.AppError.BadRequest("Số tiền yêu cầu trừ nợ phải lớn hơn 0");
            }
            let customerName = "";
            const newRequest = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const customer = await customer_1.Customer.findByPk(customerId, {
                    attributes: ["customerId", "customerName"],
                    transaction,
                });
                if (!customer) {
                    throw appError_1.AppError.NotFound("Không tìm thấy thông tin khách hàng", "CUSTOMER_NOT_FOUND");
                }
                customerName = customer.customerName;
                return await crud_helper_repository_1.CrudHelper.createData({
                    model: debtDeductionRequest_1.DebtDeductionRequest,
                    data: {
                        customerId,
                        amountRequested,
                        paymentMethod: paymentMethod || "MANUAL",
                        userId: currentUser.userId,
                        requestedBy: currentUser.fullName,
                    },
                    transaction,
                });
            });
            // Tạo thông báo đến Quản lý
            sendNotificationToManagers({
                sender: currentUser,
                customerName,
                amountRequested,
                typeConfig: requestType_1.RequestType.DEBT_DEDUCTION_REQUEST,
            });
            return {
                message: "Tạo yêu cầu cấn trừ công nợ thành công, đang chờ quản lý duyệt",
                data: newRequest,
            };
        }
        catch (error) {
            console.error("Error in createRequest:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateRequest: async ({ currentUser, requestId, amountRequested, paymentMethod, }) => {
        try {
            if (amountRequested !== undefined && amountRequested <= 0) {
                throw appError_1.AppError.BadRequest("Số tiền phải lớn hơn 0");
            }
            let wasRejected = false;
            let customerName = "";
            let finalAmount = 0;
            const updatedRequest = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                    requestId,
                    options: {
                        includeCustomer: true,
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    },
                });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu cấn trừ nợ", "REQUEST_NOT_FOUND");
                }
                // Chỉ chặn sửa khi yêu cầu đã được duyệt thành công
                if (request.status === "approved") {
                    throw appError_1.AppError.BadRequest("Không thể sửa yêu cầu đã được duyệt thành công", "CANNOT_UPDATE_PROCESSED_REQUEST");
                }
                const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
                if (!isAdminOrManager && request.userId !== currentUser.userId) {
                    throw appError_1.AppError.Forbidden("Bạn không có quyền sửa yêu cầu của người khác");
                }
                if (amountRequested !== undefined) {
                    request.amountRequested = amountRequested;
                }
                if (paymentMethod) {
                    request.paymentMethod = paymentMethod;
                }
                // Nếu yêu cầu bị từ chối trước đó -> tự động chuyển về pending để Quản lý duyệt lại
                wasRejected = request.status === "rejected";
                if (wasRejected) {
                    request.status = "pending";
                    request.rejectReason = null;
                    request.approvedBy = null;
                    request.isUrgent = false;
                }
                await request.save({ transaction });
                customerName = request.Customer?.customerName || "";
                finalAmount = request.amountRequested;
                return request;
            });
            // Nếu vừa cập nhật lại từ trạng thái rejected -> Gửi lại thông báo cho Quản lý
            if (wasRejected) {
                sendNotificationToManagers({
                    sender: currentUser,
                    customerName,
                    amountRequested: finalAmount,
                    typeConfig: requestType_1.RequestType.DEBT_DEDUCTION_RESUBMITTED,
                });
            }
            return {
                message: wasRejected
                    ? "Đã cập nhật lại yêu cầu và chuyển về trạng thái chờ duyệt"
                    : "Cập nhật yêu cầu cấn trừ công nợ thành công",
                data: updatedRequest,
            };
        }
        catch (error) {
            console.error("Error in updateRequest:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    /**
     * 4. Xóa yêu cầu (cho phép xóa khi status = pending HOẶC status = rejected)
     */
    deleteRequest: async ({ req, requestId }) => {
        try {
            const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({ requestId });
            if (!request) {
                throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu", "REQUEST_NOT_FOUND");
            }
            // Chỉ chặn xóa khi yêu cầu đã được duyệt thành công
            if (request.status === "approved") {
                throw appError_1.AppError.BadRequest("Không thể xóa yêu cầu đã được duyệt thành công");
            }
            const isAdminOrManager = req.user.role === "admin" || req.user.role === "manager";
            if (!isAdminOrManager && request.userId !== req.user.userId) {
                throw appError_1.AppError.Forbidden("Bạn không có quyền xóa yêu cầu của người khác");
            }
            await debtDeductionRepository_1.debtDeductionRepository.deleteById(requestId);
            return { message: "Xóa yêu cầu cấn trừ công nợ thành công" };
        }
        catch (error) {
            console.error("Error in deleteRequest:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    /**
     * 5. Quản lý duyệt HOẶC từ chối yêu cầu (viết chung 1 hàm)
     * - Accountant: Chỉ xem, KHÔNG được duyệt/từ chối
     * - Admin/Manager: Có quyền duyệt/từ chối
     */
    updateRequestStatus: async ({ req, requestId, newStatus, rejectReason, }) => {
        try {
            // Kiểm tra quyền: Accountant không được duyệt/từ chối
            const canReview = req.user.role === "admin" ||
                req.user.role === "manager" ||
                req.user.permissions?.includes("manager");
            if (!canReview) {
                throw appError_1.AppError.Forbidden("Kế toán chỉ có quyền xem, không được thao tác duyệt hoặc từ chối yêu cầu");
            }
            if (!["approved", "rejected"].includes(newStatus)) {
                throw appError_1.AppError.BadRequest("Trạng thái mới không hợp lệ", "INVALID_STATUS");
            }
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                    requestId,
                    options: { transaction, lock: transaction.LOCK.UPDATE },
                });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu", "REQUEST_NOT_FOUND");
                }
                if (request.status !== "pending") {
                    throw appError_1.AppError.BadRequest(`Yêu cầu này không ở trạng thái chờ duyệt (trạng thái hiện tại: ${request.status})`, "REQUEST_ALREADY_PROCESSED");
                }
                // ================= CASE TỪ CHỐI =================
                if (newStatus === "rejected") {
                    if (!rejectReason || !rejectReason.trim()) {
                        throw appError_1.AppError.BadRequest("Vui lòng nhập lý do từ chối", "REJECT_REASON_REQUIRED");
                    }
                    request.status = "rejected";
                    request.rejectReason = rejectReason;
                    request.approvedBy = req.user.fullName;
                    await request.save({ transaction });
                    // Bắn thông báo cho Sale
                    const notif = await notification_1.NotificationModel.create({
                        title: "Yêu cầu cấn trừ công nợ bị TỪ CHỐI",
                        type: "DEBT_DEDUCTION_REJECTED",
                        targetType: "user",
                        senderId: req.user.userId,
                        senderName: req.user.fullName,
                        senderDept: req.user.department || "Manager",
                        payload: {
                            requestId: request.requestId,
                            customerId: request.customerId,
                            rejectReason,
                            action: "REJECTED",
                        },
                    });
                    await userNotifications_1.UserNotifications.create({
                        notificationId: notif.notificationId,
                        receiverId: request.userId,
                        receiverDept: null,
                        isRead: false,
                    });
                    req.io?.to(`user-${request.userId}`).emit("new-notification", notif);
                    return {
                        message: `Đã từ chối yêu cầu cấn trừ nợ #${requestId}`,
                        data: request,
                    };
                }
                // ================= CASE DUYỆT (APPROVED) =================
                const customerOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                    customerId: request.customerId,
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                    includeCustomer: false,
                });
                if (customerOutbounds.length === 0) {
                    throw appError_1.AppError.BadRequest("Khách hàng không còn PXK nào cần thanh toán");
                }
                const updatedOutboundMap = new Map();
                const allocationsToCreate = [];
                // Tái sử dụng engine cấn trừ FIFO từ debtManagementService
                const excessAmount = (0, debtManagementService_1.coreCustomerPayment)({
                    amount: request.amountRequested,
                    paymentMethod: request.paymentMethod,
                    customerOutbounds,
                    updatedOutboundMap,
                    allocationsToCreate,
                });
                // Gán requestId để lưu vết
                allocationsToCreate.forEach((alloc) => {
                    alloc.requestId = request.requestId;
                });
                if (updatedOutboundMap.size > 0) {
                    const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(({ outbound, paidAmount, remainingAmount }) => ({
                        ...outbound,
                        paidAmount,
                        remainingAmount,
                        status: remainingAmount === 0 ? "paid" : "partial",
                    }));
                    await debtRepository_1.debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
                }
                if (allocationsToCreate.length > 0) {
                    await debtRepository_1.debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
                }
                request.status = "approved";
                request.approvedBy = req.user.fullName;
                await request.save({ transaction });
                // Thông báo phản hồi cho Sale
                const notif = await notification_1.NotificationModel.create({
                    title: "Yêu cầu cấn trừ công nợ đã được DUYỆT",
                    type: "DEBT_DEDUCTION_APPROVED",
                    targetType: "user",
                    senderId: req.user.userId,
                    senderName: req.user.fullName,
                    senderDept: req.user.department || "Manager",
                    payload: {
                        requestId: request.requestId,
                        customerId: request.customerId,
                        amountRequested: request.amountRequested,
                        allocatedAmount: request.amountRequested - excessAmount,
                        action: "APPROVED",
                    },
                });
                await userNotifications_1.UserNotifications.create({
                    notificationId: notif.notificationId,
                    receiverId: request.userId,
                    receiverDept: null,
                    isRead: false,
                });
                req.io?.to(`user-${request.userId}`).emit("new-notification", notif);
                return {
                    message: `Duyệt yêu cầu cấn trừ nợ #${requestId} thành công`,
                    requestId,
                    allocatedTotal: request.amountRequested - excessAmount,
                    excessAmount,
                };
            });
        }
        catch (error) {
            console.error("Error in updateRequestStatus:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    /**
     * 6. Thông báo nhanh: Gửi OTP về Telegram của Quản lý
     */
    requestUrgentOtp: async ({ req, requestId }) => {
        try {
            const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                requestId,
                options: { includeCustomer: true },
            });
            if (!request) {
                throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu cấn trừ nợ", "REQUEST_NOT_FOUND");
            }
            if (request.status !== "pending") {
                throw appError_1.AppError.BadRequest("Chỉ có thể yêu cầu OTP cho phiếu đang chờ duyệt");
            }
            const currentDebt = await debtRepository_1.debtRepository.getCustomerCurrentDebt(request.customerId);
            const otp = Math.floor(1000 + Math.random() * 9000);
            const redisKey = `debt_request_otp:${requestId}`;
            await redis_connect_1.default.set(redisKey, otp, "EX", 900); // 15 phút
            request.isUrgent = true;
            await request.save();
            const customerName = request.Customer?.customerName || request.customerId;
            const message = `
🚨 <b>YÊU CẦU DUYỆT KHẨN CẤP CẤN TRỪ CÔNG NỢ</b>

📋 <b>Mã yêu cầu:</b> #<code>${requestId}</code>
👤 <b>Sale tạo:</b> ${request.requestedBy}
🏢 <b>Khách hàng:</b> ${customerName} (Mã: <code>${request.customerId}</code>)
💵 <b>Số tiền đề xuất trừ:</b> ${request.amountRequested.toLocaleString()} đ
📊 <b>Công nợ hiện tại:</b> ${Number(currentDebt || 0).toLocaleString()} đ

───────────────────────
🔑 <b>MÃ OTP XÁC NHẬN:</b> <code>${otp}</code>
<i>(Mã hiệu lực 15 phút. Cung cấp mã cho Sale nếu bạn đồng ý duyệt)</i>
      `.trim();
            await (0, telegramSendAlert_1.sendTelegramAlertOtp)(message);
            return {
                message: "Đã gửi thông báo khẩn cấp và mã OTP về Telegram của Quản lý!",
            };
        }
        catch (error) {
            console.error("Error in requestUrgentOtp:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    /**
     * 7. Nhập mã OTP từ Telegram để tự động duyệt & cấn trừ nợ
     */
    verifyUrgentOtp: async ({ req, requestId, otp, }) => {
        try {
            const redisKey = `debt_request_otp:${requestId}`;
            const savedOtp = await redis_connect_1.default.get(redisKey);
            if (!savedOtp || Number(savedOtp) !== Number(otp)) {
                throw appError_1.AppError.BadRequest("Mã OTP không hợp lệ hoặc đã hết hạn", "INVALID_OTP");
            }
            await redis_connect_1.default.del(redisKey);
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                    requestId,
                    options: { transaction, lock: transaction.LOCK.UPDATE },
                });
                if (!request || request.status !== "pending") {
                    throw appError_1.AppError.BadRequest("Yêu cầu không hợp lệ hoặc đã được xử lý");
                }
                const customerOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                    customerId: request.customerId,
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                    includeCustomer: false,
                });
                if (customerOutbounds.length === 0) {
                    throw appError_1.AppError.BadRequest("Khách hàng không còn PXK nào cần thanh toán");
                }
                const updatedOutboundMap = new Map();
                const allocationsToCreate = [];
                const excessAmount = (0, debtManagementService_1.coreCustomerPayment)({
                    amount: request.amountRequested,
                    paymentMethod: request.paymentMethod,
                    customerOutbounds,
                    updatedOutboundMap,
                    allocationsToCreate,
                });
                allocationsToCreate.forEach((alloc) => {
                    alloc.requestId = request.requestId;
                });
                if (updatedOutboundMap.size > 0) {
                    const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(({ outbound, paidAmount, remainingAmount }) => ({
                        ...outbound,
                        paidAmount,
                        remainingAmount,
                        status: remainingAmount === 0 ? "paid" : "partial",
                    }));
                    await debtRepository_1.debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
                }
                if (allocationsToCreate.length > 0) {
                    await debtRepository_1.debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
                }
                request.status = "approved";
                request.approvedBy = `${req.user.fullName} (Duyệt qua OTP Telegram)`;
                await request.save({ transaction });
                return {
                    message: "Xác thực OTP thành công. Đã cấn trừ công nợ cho khách hàng!",
                    requestId,
                    allocatedTotal: request.amountRequested - excessAmount,
                    excessAmount,
                };
            });
        }
        catch (error) {
            console.error("Error in verifyUrgentOtpAndApprove:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//helpers
const sendNotificationToManagers = async ({ sender, customerName, amountRequested, typeConfig, }) => {
    try {
        const managers = await user_1.User.findAll({
            where: { role: ["manager"], department: "Accountant" },
            attributes: ["userId", "department"],
        });
        if (managers.length === 0)
            return;
        const config = requestType_1.REQUEST_CONFIG[typeConfig];
        if (!config) {
            throw appError_1.AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
        }
        const notif = await notification_1.NotificationModel.create({
            title: config.titleCreate(),
            type: typeConfig,
            targetType: "user",
            senderId: sender.userId,
            senderName: sender.fullName,
            senderDept: sender.department,
            payload: {
                customerName,
                amountRequested,
                action: requestType_1.RequestAction.REQUEST,
            },
        });
        await userNotifications_1.UserNotifications.bulkCreate(managers.map((m) => ({
            notificationId: notif.notificationId,
            receiverId: m.userId,
            receiverDept: m.department || null,
        })));
        const io = (0, socket_1.getIO)();
        managers.forEach((m) => {
            io.to(`user-${m.userId}`).emit("new-notification", notif);
        });
    }
    catch (error) {
        console.error("Error in send Notification To Managers:", error);
        if (error instanceof appError_1.AppError)
            throw error;
    }
};
//# sourceMappingURL=debtDeductionService.js.map