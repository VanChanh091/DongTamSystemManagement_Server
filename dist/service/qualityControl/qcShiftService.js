"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcShiftService = void 0;
const appError_1 = require("../../utils/appError");
const qcShift_1 = require("../../models/qualityControl/qcShift");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
exports.qcShiftService = {
    getCurrentShiftActive: async (userId) => {
        try {
            const activeShift = await qcShift_1.QcShift.findOne({ where: { isActive: true, userId } });
            const response = {
                username: activeShift?.username ?? null,
                startedAt: activeShift?.startedAt ?? null,
                isActive: activeShift?.isActive,
            };
            return { isOnDuty: !!activeShift, shiftInfo: response ?? null };
        }
        catch (error) {
            console.error("get current QC shift failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    startShift: async (user) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Kiểm tra xem người dùng đã có ca QC đang hoạt động chưa
                const activeShift = await qcShift_1.QcShift.findOne({
                    where: { isActive: true, userId: user.userId },
                    order: [["createdAt", "DESC"]],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (activeShift) {
                    throw appError_1.AppError.BadRequest("Bạn đã ở trong ca làm việc từ trước", "ACTIVE_SHIFT_EXISTS");
                }
                // Tạo ca QC mới
                const newShift = await qcShift_1.QcShift.create({
                    startedAt: new Date(),
                    userId: user.userId,
                    username: user.fullName,
                }, { transaction });
                return { message: "Tạo ca QC thành công", data: newShift };
            });
        }
        catch (error) {
            console.error("start QC shift failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    endShift: async (userId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Tìm ca QC đang hoạt động
                const activeShift = await qcShift_1.QcShift.findOne({
                    where: { isActive: true, userId },
                    order: [["createdAt", "DESC"]],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!activeShift) {
                    throw appError_1.AppError.BadRequest("Không tìm thấy ca QC đang hoạt động", "ACTIVE_SHIFT_NOT_FOUND");
                }
                // Cập nhật ca QC
                await activeShift.update({ endedAt: new Date(), isActive: false }, { transaction });
                return { message: "Cập nhật ca QC thành công", data: activeShift };
            });
        }
        catch (error) {
            console.error("end QC shift failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=qcShiftService.js.map