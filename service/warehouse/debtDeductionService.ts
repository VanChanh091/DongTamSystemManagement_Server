import { Transaction } from "sequelize";
import { User } from "../../models/user/user";
import { AppError } from "../../utils/appError";
import { getIO } from "../../utils/socket/socket";
import { Customer } from "../../models/customer/customer";
import { coreCustomerPayment } from "./debtManagementService";
import { debtRepository } from "../../repository/debtRepository";
import redisCache from "../../assets/configs/connect/redis.connect";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { NotificationModel } from "../../models/notification/notification";
import { CrudHelper } from "../../repository/helper/crud.helper.repository";
import { sendTelegramAlertOtp } from "../../utils/telegram/telegramSendAlert";
import { DebtDeductionRequest } from "../../models/debt/debtDeductionRequest";
import { UserNotifications } from "../../models/notification/userNotifications";
import { debtDeductionRepository } from "../../repository/debtDeductionRepository";
import { REQUEST_CONFIG, RequestAction, RequestType } from "../notification/requestType";

export const debtDeductionService = {
  getDebtDeductionRequests: async ({
    page,
    pageSize,
    status,
    currentUser,
    targetUserId,
    customerId,
  }: {
    page: number;
    pageSize: number;
    status: string[];
    currentUser: any;
    targetUserId?: number;
    customerId?: string;
  }) => {
    try {
      const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);

      let filterUserId: number | undefined;
      if (isAdminOrManager) {
        filterUserId = targetUserId;
      } else {
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

      const queryOptions = debtDeductionRepository.buildDebtDeductionOptions({
        page,
        pageSize,
        status,
        filterUserId,
        customerId,
      });
      const { rows, count } = await DebtDeductionRequest.findAndCountAll(queryOptions);
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
        totalDebt: count,
        totalPages,
        currentPage: page,
      };

      //  await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("Error in getRequests:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createRequest: async ({
    currentUser,
    customerId,
    amountRequested,
    paymentMethod,
  }: {
    currentUser: { userId: number; fullName: string; department: string };
    customerId: string;
    amountRequested: number;
    paymentMethod: string;
  }) => {
    try {
      if (!amountRequested || amountRequested <= 0) {
        throw AppError.BadRequest("Số tiền yêu cầu trừ nợ phải lớn hơn 0", "INVALID_AMOUNT");
      }

      let customerName = "";

      const newRequest = await runInTransaction(async (transaction: Transaction) => {
        const customer = await Customer.findByPk(customerId, {
          attributes: ["customerId", "customerName"],
          transaction,
        });

        if (!customer) {
          throw AppError.NotFound("Không tìm thấy thông tin khách hàng", "CUSTOMER_NOT_FOUND");
        }

        customerName = customer.customerName;

        return await CrudHelper.createData({
          model: DebtDeductionRequest,
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
        typeConfig: RequestType.DEBT_DEDUCTION_REQUEST,
      });

      return {
        message: "Tạo yêu cầu cấn trừ công nợ thành công, đang chờ quản lý duyệt",
        data: newRequest,
      };
    } catch (error) {
      console.error("Error in createRequest:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateRequest: async ({
    currentUser,
    requestId,
    amountRequested,
    paymentMethod,
  }: {
    currentUser: { userId: number; role: string; fullName: string; department: string };
    requestId: number;
    amountRequested?: number;
    paymentMethod?: string;
  }) => {
    try {
      if (amountRequested !== undefined && amountRequested <= 0) {
        throw AppError.BadRequest("Số tiền phải lớn hơn 0", "INVALID_AMOUNT");
      }

      let wasRejected = false;
      let customerName = "";
      let finalAmount = 0;

      const updatedRequest = await runInTransaction(async (transaction: Transaction) => {
        const request = await debtDeductionRepository.getDebtDeductionById({
          requestId,
          options: {
            includeCustomer: true,
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        });
        if (!request) {
          throw AppError.NotFound("Không tìm thấy yêu cầu cấn trừ nợ", "REQUEST_NOT_FOUND");
        }

        // Chỉ chặn sửa khi yêu cầu đã được duyệt thành công
        if (request.status === "approved") {
          throw AppError.BadRequest(
            "Không thể sửa yêu cầu đã được duyệt thành công",
            "CANNOT_UPDATE_PROCESSED_REQUEST",
          );
        }

        const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
        if (!isAdminOrManager && request.userId !== currentUser.userId) {
          throw AppError.Forbidden(
            "Bạn không có quyền sửa yêu cầu của người khác",
            "CANNOT_UPDATE_OTHERS_REQUEST",
          );
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

        customerName = (request as any).Customer?.customerName || "";
        finalAmount = request.amountRequested;

        return request;
      });

      // Nếu vừa cập nhật lại từ trạng thái rejected -> Gửi lại thông báo cho Quản lý
      if (wasRejected) {
        sendNotificationToManagers({
          sender: currentUser,
          customerName,
          amountRequested: finalAmount,
          typeConfig: RequestType.DEBT_DEDUCTION_RESUBMITTED,
        });
      }

      return {
        message: wasRejected
          ? "Đã cập nhật lại yêu cầu và chuyển về trạng thái chờ duyệt"
          : "Cập nhật yêu cầu cấn trừ công nợ thành công",
        data: updatedRequest,
      };
    } catch (error) {
      console.error("Error in updateRequest:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteRequest: async ({ currentUser, requestId }: { currentUser: any; requestId: number }) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        const request = await debtDeductionRepository.getDebtDeductionById({
          requestId,
          options: { transaction, lock: transaction.LOCK.UPDATE },
        });
        if (!request) {
          throw AppError.NotFound("Không tìm thấy yêu cầu", "REQUEST_NOT_FOUND");
        }

        // Chỉ chặn xóa khi yêu cầu đã được duyệt thành công
        if (request.status === "approved") {
          throw AppError.BadRequest(
            "Không thể xóa yêu cầu đã được duyệt thành công",
            "CANNOT_DELETE_PROCESSED_REQUEST",
          );
        }

        const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
        if (!isAdminOrManager && request.userId !== currentUser.userId) {
          throw AppError.Forbidden(
            "Bạn không có quyền xóa yêu cầu của người khác",
            "CANNOT_DELETE_OTHERS_REQUEST",
          );
        }

        await request.destroy({ transaction });

        return { message: "Xóa yêu cầu cấn trừ công nợ thành công" };
      });
    } catch (error) {
      console.error("Error in deleteRequest:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // approved or reject debt deduction request (for admin/manager)
  updateRequestStatus: async ({
    currentUser,
    requestId,
    newStatus,
    rejectReason,
  }: {
    currentUser: { userId: number; role: string; fullName: string; department?: string };
    requestId: number;
    newStatus: "approved" | "rejected";
    rejectReason?: string;
  }) => {
    try {
      const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);
      if (!isAdminOrManager) {
        throw AppError.Forbidden(
          "Bạn không có quyền duyệt hoặc từ chối yêu cầu này",
          "FORBIDDEN_ACTION",
        );
      }

      if (!["approved", "rejected"].includes(newStatus)) {
        throw AppError.BadRequest("Trạng thái mới không hợp lệ", "INVALID_STATUS");
      }

      const config = REQUEST_CONFIG[RequestType.DEBT_DEDUCTION_REQUEST];
      if (!config) {
        throw AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
      }

      const { responseData, notificationPayload } = await runInTransaction(
        async (transaction: Transaction) => {
          const request = await debtDeductionRepository.getDebtDeductionById({
            requestId,
            options: { transaction, lock: transaction.LOCK.UPDATE },
          });
          if (!request) {
            throw AppError.NotFound("Không tìm thấy yêu cầu", "REQUEST_NOT_FOUND");
          }

          if (request.status !== "pending") {
            throw AppError.BadRequest(
              "Yêu cầu này không ở trạng thái chờ duyệt",
              "REQUEST_ALREADY_PROCESSED",
            );
          }

          // ================= CASE TỪ CHỐI =================
          if (newStatus === "rejected") {
            if (!rejectReason || !rejectReason.trim()) {
              throw AppError.BadRequest("Vui lòng nhập lý do từ chối", "REJECT_REASON_REQUIRED");
            }

            request.status = "rejected";
            request.rejectReason = rejectReason;
            request.approvedBy = currentUser.fullName;
            await request.save({ transaction });

            return {
              notificationPayload: {
                receiverId: request.userId,
                title: config.titleRejected,
                type: RequestType.DEBT_DEDUCTION_REJECTED,
                payload: {
                  requestId: request.requestId,
                  customerId: request.customerId,
                  rejectReason: request.rejectReason,
                  action: RequestAction.RESPONSE,
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
              type: RequestType.DEBT_DEDUCTION_APPROVED,
              payload: {
                requestId: request.requestId,
                customerId: request.customerId,
                amountRequested: request.amountRequested,
                allocatedAmount: allocatedTotal,
                excessAmount,
                action: RequestAction.RESPONSE,
              },
            },
            responseData: {
              message: `Duyệt yêu cầu cấn trừ nợ #${requestId} thành công`,
              requestId,
              allocatedTotal,
              excessAmount,
            },
          };
        },
      );

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
    } catch (error) {
      console.error("Error in updateRequestStatus:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  requestUrgentOtp: async ({ requestId }: { requestId: number }) => {
    try {
      const { responseMessage, telegramMessage } = await runInTransaction(
        async (transaction: Transaction) => {
          const request = await debtDeductionRepository.getDebtDeductionById({
            requestId,
            options: { transaction, includeCustomer: true },
          });

          if (!request) {
            throw AppError.NotFound("Không tìm thấy yêu cầu cấn trừ nợ", "REQUEST_NOT_FOUND");
          }

          if (request.status !== "pending") {
            throw AppError.BadRequest(
              "Chỉ có thể yêu cầu OTP cho phiếu đang chờ duyệt",
              "REQUEST_NOT_PENDING",
            );
          }

          const currentDebt = await debtRepository.getCustomerCurrentDebt(
            request.customerId,
            transaction,
          );
          const roundedCurrentDebt = Math.round(currentDebt);

          // generate OTP code
          const otp = Math.floor(1000 + Math.random() * 9000);

          // save OTP code into Redis with 30 minutes expiration
          const redisKey = `debt_request_otp:${requestId}`;
          await redisCache.set(redisKey, otp, "EX", 1800);

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
        },
      );

      if (telegramMessage) {
        sendTelegramAlertOtp(telegramMessage).catch((err) => {
          console.error("Lỗi gửi Telegram ngầm:", err);
        });
      }
      return responseMessage;
    } catch (error) {
      console.error("Error in requestUrgentOtp:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  verifyUrgentOtp: async ({
    username,
    requestId,
    otp,
  }: {
    username: string;
    requestId: number;
    otp: number;
  }) => {
    try {
      const redisKey = `debt_request_otp:${requestId}`;
      const savedOtp = await redisCache.get(redisKey);

      if (!savedOtp || Number(savedOtp) !== Number(otp)) {
        throw AppError.BadRequest("Mã OTP không hợp lệ hoặc đã hết hạn", "INVALID_OTP");
      }

      await redisCache.del(redisKey);

      return await runInTransaction(async (transaction: Transaction) => {
        const request = await debtDeductionRepository.getDebtDeductionById({
          requestId,
          options: { transaction, lock: transaction.LOCK.UPDATE },
        });

        if (!request || request.status !== "pending") {
          throw AppError.BadRequest("Yêu cầu không hợp lệ hoặc đã được xử lý");
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
    } catch (error) {
      console.error("Error in verifyUrgentOtpAndApprove:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};

//helpers
const sendNotificationToManagers = async ({
  sender,
  customerName,
  amountRequested,
  typeConfig,
}: {
  sender: { userId: number; fullName: string; department: string };
  customerName: string;
  amountRequested: number;
  typeConfig: string;
}) => {
  try {
    const managers = await User.findAll({
      where: { role: ["manager"], department: "Accountant" },
      attributes: ["userId", "department"],
    });
    if (managers.length === 0) return;

    const config = REQUEST_CONFIG[typeConfig];
    if (!config) {
      throw AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
    }

    const notif = await NotificationModel.create({
      title: config.titleCreate(),
      type: typeConfig,
      targetType: "user",
      senderId: sender.userId,
      senderName: sender.fullName,
      senderDept: sender.department,
      payload: {
        customerName,
        amountRequested,
        action: RequestAction.REQUEST,
      },
    });

    await UserNotifications.bulkCreate(
      managers.map((m) => ({
        notificationId: notif.notificationId,
        receiverId: m.userId,
        receiverDept: m.department || null,
      })),
    );

    const io = getIO();
    managers.forEach((m) => {
      io.to(`user-${m.userId}`).emit("new-notification", notif);
    });
  } catch (error) {
    console.error("Error in send Notification To Managers:", error);
    if (error instanceof AppError) throw error;
  }
};

const sendApprovalNotification = async ({
  receiverId,
  sender,
  title,
  type,
  payload,
}: {
  receiverId: number;
  sender: { userId: number; fullName: string; department?: string };
  title: string;
  type: string;
  payload: Record<string, any>;
}) => {
  try {
    const notif = await NotificationModel.create({
      title,
      type,
      targetType: "user",
      senderId: sender.userId,
      senderName: sender.fullName,
      senderDept: sender.department || "Manager",
      payload,
    });

    await UserNotifications.create({
      notificationId: notif.notificationId,
      receiverId,
      receiverDept: null,
      isRead: false,
    });

    const io = getIO();
    io.to(`user-${receiverId}`).emit("new-notification", notif);
  } catch (error) {
    console.error("[Notification Error] Không thể gửi thông báo duyệt/từ chối:", error);
  }
};

const processDebtDeductionApproval = async ({
  request,
  transaction,
}: {
  request: DebtDeductionRequest;
  transaction: Transaction;
}) => {
  const customerOutbounds = await debtRepository.findOutboundUnpaid({
    customerId: request.customerId,
    transaction,
    lock: transaction.LOCK.UPDATE,
    includeCustomer: false,
  });

  if (customerOutbounds.length === 0) {
    throw AppError.BadRequest("Khách hàng không còn PXK nào cần thanh toán", "NO_OUTBOUND_TO_PAY");
  }

  const updatedOutboundMap = new Map();
  const allocationsToCreate: any[] = [];

  // Tái sử dụng engine cấn trừ FIFO
  const excessAmount = coreCustomerPayment({
    amount: request.amountRequested,
    paymentMethod: request.paymentMethod as any,
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
    const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(
      ({ outbound, paidAmount, remainingAmount }) => ({
        ...outbound,
        paidAmount,
        remainingAmount,
        status: remainingAmount === 0 ? "paid" : "partial",
      }),
    );
    await debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
  }

  // Bulk create chi tiết phân bổ tiền
  if (allocationsToCreate.length > 0) {
    await debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
  }

  const allocatedTotal = request.amountRequested - excessAmount;
  return { allocatedTotal, excessAmount };
};
