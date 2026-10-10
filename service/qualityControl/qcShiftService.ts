import { AppError } from "../../utils/appError";
import { QcShift } from "../../models/qualityControl/qcShift";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const qcShiftService = {
  getCurrentShiftActive: async (userId: number) => {
    try {
      const activeShift = await QcShift.findOne({ where: { isActive: true, userId } });

      const response = {
        username: activeShift?.username ?? null,
        startedAt: activeShift?.startedAt ?? null,
        isActive: activeShift?.isActive,
      };
      return { isOnDuty: !!activeShift, shiftInfo: response ?? null };
    } catch (error) {
      console.error("get current QC shift failed:", error);
      throw AppError.ServerError();
    }
  },

  startShift: async (user: any) => {
    try {
      return await runInTransaction(async (transaction) => {
        // Kiểm tra xem người dùng đã có ca QC đang hoạt động chưa
        const activeShift = await QcShift.findOne({
          where: { isActive: true, userId: user.userId },
          order: [["createdAt", "DESC"]],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (activeShift) {
          throw AppError.BadRequest("Bạn đã ở trong ca làm việc từ trước", "ACTIVE_SHIFT_EXISTS");
        }

        // Tạo ca QC mới
        const newShift = await QcShift.create(
          {
            startedAt: new Date(),
            userId: user.userId,
            username: user.fullName,
          },
          { transaction },
        );
        return { message: "Tạo ca QC thành công", data: newShift };
      });
    } catch (error) {
      console.error("start QC shift failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  endShift: async (userId: number) => {
    try {
      return await runInTransaction(async (transaction) => {
        // Tìm ca QC đang hoạt động
        const activeShift = await QcShift.findOne({
          where: { isActive: true, userId },
          order: [["createdAt", "DESC"]],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!activeShift) {
          throw AppError.BadRequest(
            "Không tìm thấy ca QC đang hoạt động",
            "ACTIVE_SHIFT_NOT_FOUND",
          );
        }

        // Cập nhật ca QC
        await activeShift.update({ endedAt: new Date(), isActive: false }, { transaction });

        return { message: "Cập nhật ca QC thành công", data: activeShift };
      });
    } catch (error) {
      console.error("end QC shift failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
