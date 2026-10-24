"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtDeductionService = void 0;
const user_1 = require("../../models/user/user");
const appError_1 = require("../../utils/appError");
const socket_1 = require("../../utils/socket/socket");
const customer_1 = require("../../models/customer/customer");
const debtManagementService_1 = require("./debtManagementService");
const debtRepository_1 = require("../../repository/debtRepository");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const notification_1 = require("../../models/notification/notification");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const telegramSendAlert_1 = require("../../utils/telegram/telegramSendAlert");
const debtDeductionRequest_1 = require("../../models/debt/debtDeductionRequest");
const userNotifications_1 = require("../../models/notification/userNotifications");
const debtDeductionRepository_1 = require("../../repository/debtDeductionRepository");
const requestType_1 = require("../notification/requestType");
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
            // Lấy danh sách customerId duy nhất trong trang hiện tại
            const customerIds = [...new Set(rows.map((r) => r.customerId))];
            const debtMap = new Map();
            if (customerIds.length > 0) {
                const unpaidOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                    customerId: customerIds,
                    includeCustomer: false,
                });
                unpaidOutbounds.forEach((ob) => {
                    const current = debtMap.get(ob.customerId) || 0;
                    debtMap.set(ob.customerId, current + (Number(ob.remainingAmount) || 0));
                });
            }
            const dataWithDebt = rows.map((item) => {
                const plainItem = item.get ? item.get({ plain: true }) : item;
                return {
                    ...plainItem,
                    currentDebt: Math.round(debtMap.get(item.customerId) || 0),
                };
            });
            const responseData = {
                message: "Lấy danh sách yêu cầu cấn trừ nợ thành công",
                data: dataWithDebt,
                totalDebt: count,
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
                throw appError_1.AppError.BadRequest("Số tiền yêu cầu trừ nợ phải lớn hơn 0", "INVALID_AMOUNT");
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
                throw appError_1.AppError.BadRequest("Số tiền phải lớn hơn 0", "INVALID_AMOUNT");
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
                    throw appError_1.AppError.Forbidden("Bạn không có quyền sửa yêu cầu của người khác", "CANNOT_UPDATE_OTHERS_REQUEST");
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
    deleteRequest: async ({ currentUser, requestId }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                    requestId,
                    options: { transaction, lock: transaction.LOCK.UPDATE },
                });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu", "REQUEST_NOT_FOUND");
                }
                // Chỉ chặn xóa khi yêu cầu đã được duyệt thành công
                if (request.status === "approved") {
                    throw appError_1.AppError.BadRequest("Không thể xóa yêu cầu đã được duyệt thành công", "CANNOT_DELETE_PROCESSED_REQUEST");
                }
                const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
                if (!isAdminOrManager && request.userId !== currentUser.userId) {
                    throw appError_1.AppError.Forbidden("Bạn không có quyền xóa yêu cầu của người khác", "CANNOT_DELETE_OTHERS_REQUEST");
                }
                await request.destroy({ transaction });
                return { message: "Xóa yêu cầu cấn trừ công nợ thành công" };
            });
        }
        catch (error) {
            console.error("Error in deleteRequest:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // approved or reject debt deduction request (for admin/manager)
    updateRequestStatus: async ({ currentUser, requestId, newStatus, rejectReason, }) => {
        try {
            const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
            if (!isAdminOrManager) {
                throw appError_1.AppError.Forbidden("Bạn không có quyền duyệt hoặc từ chối yêu cầu này", "FORBIDDEN_ACTION");
            }
            if (!["approved", "rejected"].includes(newStatus)) {
                throw appError_1.AppError.BadRequest("Trạng thái mới không hợp lệ", "INVALID_STATUS");
            }
            const config = requestType_1.REQUEST_CONFIG[requestType_1.RequestType.DEBT_DEDUCTION_REQUEST];
            if (!config) {
                throw appError_1.AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
            }
            const { responseData, notificationPayload } = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                    requestId,
                    options: { transaction, lock: transaction.LOCK.UPDATE },
                });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu", "REQUEST_NOT_FOUND");
                }
                if (request.status !== "pending") {
                    throw appError_1.AppError.BadRequest("Yêu cầu này không ở trạng thái chờ duyệt", "REQUEST_ALREADY_PROCESSED");
                }
                // ================= CASE TỪ CHỐI =================
                if (newStatus === "rejected") {
                    if (!rejectReason || !rejectReason.trim()) {
                        throw appError_1.AppError.BadRequest("Vui lòng nhập lý do từ chối", "REJECT_REASON_REQUIRED");
                    }
                    request.status = "rejected";
                    request.rejectReason = rejectReason;
                    request.approvedBy = currentUser.fullName;
                    await request.save({ transaction });
                    return {
                        notificationPayload: {
                            receiverId: request.userId,
                            title: config.titleRejected,
                            type: requestType_1.RequestType.DEBT_DEDUCTION_REJECTED,
                            payload: {
                                requestId: request.requestId,
                                customerId: request.customerId,
                                rejectReason: request.rejectReason,
                                action: requestType_1.RequestAction.RESPONSE,
                            },
                        },
                        responseData: {
                            message: `Đã từ chối yêu cầu cấn trừ nợ #${requestId}`,
                            data: request,
                        },
                    };
                }
                // ================= CASE DUYỆT (APPROVED) =================
                const { allocatedTotal, excessAmount } = await processDebtDeductionApproval({
                    request,
                    transaction,
                });
                request.status = "approved";
                request.approvedBy = currentUser.fullName;
                await request.save({ transaction });
                return {
                    notificationPayload: {
                        receiverId: request.userId,
                        title: config.titleApproved,
                        type: requestType_1.RequestType.DEBT_DEDUCTION_APPROVED,
                        payload: {
                            requestId: request.requestId,
                            customerId: request.customerId,
                            amountRequested: request.amountRequested,
                            allocatedAmount: allocatedTotal,
                            excessAmount,
                            action: requestType_1.RequestAction.RESPONSE,
                        },
                    },
                    responseData: {
                        message: `Duyệt yêu cầu cấn trừ nợ #${requestId} thành công`,
                        requestId,
                        allocatedTotal,
                        excessAmount,
                    },
                };
            });
            // Gửi thông báo đến Sale tạo yêu cầu
            if (notificationPayload) {
                sendApprovalNotification({
                    receiverId: notificationPayload.receiverId,
                    title: notificationPayload.title,
                    type: notificationPayload.type,
                    payload: notificationPayload.payload,
                    sender: currentUser,
                });
            }
            return responseData;
        }
        catch (error) {
            console.error("Error in updateRequestStatus:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    requestUrgentOtp: async ({ requestId }) => {
        try {
            const { responseMessage, telegramMessage } = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await debtDeductionRepository_1.debtDeductionRepository.getDebtDeductionById({
                    requestId,
                    options: { transaction, includeCustomer: true },
                });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu cấn trừ nợ", "REQUEST_NOT_FOUND");
                }
                if (request.status !== "pending") {
                    throw appError_1.AppError.BadRequest("Chỉ có thể yêu cầu OTP cho phiếu đang chờ duyệt", "REQUEST_NOT_PENDING");
                }
                const currentDebt = await debtRepository_1.debtRepository.getCustomerCurrentDebt(request.customerId, transaction);
                const roundedCurrentDebt = Math.round(currentDebt);
                // generate OTP code
                const otp = Math.floor(1000 + Math.random() * 9000);
                // save OTP code into Redis with 30 minutes expiration
                const redisKey = `debt_request_otp:${requestId}`;
                await redis_connect_1.default.set(redisKey, otp, "EX", 1800);
                request.isUrgent = true;
                await request.save({ transaction });
                const customerName = request.Customer?.customerName;
                const amountRequested = request.amountRequested;
                const message = `
            🚨 <b>YÊU CẦU OTP CẤN TRỪ CÔNG NỢ</b>

            👤 <b>Người yêu cầu:</b> ${request.requestedBy}
            🏢 <b>Khách hàng:</b> ${customerName}
            💵 <b>Số tiền cấn trừ:</b> ${amountRequested.toLocaleString()} đ
            📊 <b>Công nợ hiện tại:</b> ${roundedCurrentDebt.toLocaleString()} đ

            ───────────────────────
            🔑 <b>MÃ OTP XÁC NHẬN:</b> <code>${otp}</code>
            <i>(Mã có hiệu lực trong 30 phút. Chạm vào số để copy)</i>
            `.trim();
                return {
                    responseMessage: {
                        message: "Đã gửi thông báo khẩn cấp và mã OTP về Telegram của Quản lý!",
                    },
                    telegramMessage: message,
                };
            });
            if (telegramMessage) {
                (0, telegramSendAlert_1.sendTelegramAlertOtp)(telegramMessage).catch((err) => {
                    console.error("Lỗi gửi Telegram ngầm:", err);
                });
            }
            return responseMessage;
        }
        catch (error) {
            console.error("Error in requestUrgentOtp:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    verifyUrgentOtp: async ({ username, requestId, otp, }) => {
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
                const { allocatedTotal, excessAmount } = await processDebtDeductionApproval({
                    request,
                    transaction,
                });
                request.status = "approved";
                request.approvedBy = username;
                await request.save({ transaction });
                return {
                    message: "Xác thực OTP thành công. Đã cấn trừ công nợ cho khách hàng!",
                    requestId,
                    allocatedTotal,
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
const sendApprovalNotification = async ({ receiverId, sender, title, type, payload, }) => {
    try {
        const notif = await notification_1.NotificationModel.create({
            title,
            type,
            targetType: "user",
            senderId: sender.userId,
            senderName: sender.fullName,
            senderDept: sender.department || "Manager",
            payload,
        });
        await userNotifications_1.UserNotifications.create({
            notificationId: notif.notificationId,
            receiverId,
            receiverDept: null,
            isRead: false,
        });
        const io = (0, socket_1.getIO)();
        io.to(`user-${receiverId}`).emit("new-notification", notif);
    }
    catch (error) {
        console.error("[Notification Error] Không thể gửi thông báo duyệt/từ chối:", error);
    }
};
const processDebtDeductionApproval = async ({ request, transaction, }) => {
    const customerOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
        customerId: request.customerId,
        transaction,
        lock: transaction.LOCK.UPDATE,
        includeCustomer: false,
    });
    if (customerOutbounds.length === 0) {
        throw appError_1.AppError.BadRequest("Khách hàng không còn PXK nào cần thanh toán", "NO_OUTBOUND_TO_PAY");
    }
    const updatedOutboundMap = new Map();
    const allocationsToCreate = [];
    // Tái sử dụng engine cấn trừ FIFO
    const excessAmount = (0, debtManagementService_1.coreCustomerPayment)({
        amount: request.amountRequested,
        paymentMethod: request.paymentMethod,
        customerOutbounds,
        updatedOutboundMap,
        allocationsToCreate,
    });
    // Gán requestId để lưu vết lịch sử
    allocationsToCreate.forEach((alloc) => {
        alloc.requestId = request.requestId;
    });
    // Bulk update trạng thái các Phiếu xuất kho
    if (updatedOutboundMap.size > 0) {
        const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(({ outbound, paidAmount, remainingAmount }) => ({
            ...outbound,
            paidAmount,
            remainingAmount,
            status: remainingAmount === 0 ? "paid" : "partial",
        }));
        await debtRepository_1.debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
    }
    // Bulk create chi tiết phân bổ tiền
    if (allocationsToCreate.length > 0) {
        await debtRepository_1.debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
    }
    const allocatedTotal = request.amountRequested - excessAmount;
    return { allocatedTotal, excessAmount };
};
//# sourceMappingURL=debtDeductionService.js.map