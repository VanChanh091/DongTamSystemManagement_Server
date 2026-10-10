import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { Op } from "sequelize";
import { OrderImage } from "../../models/order/orderImage";
import cloudinary from "../../assets/configs/connect/cloudinary.connect";
import { debtManagementService } from "../../service/warehouse/debtManagementService";
import { QcShift } from "../../models/qualityControl/qcShift";

const devEnvironment = process.env.NODE_ENV !== "production";
const TIMEZONE = "Asia/Ho_Chi_Minh";

//* * * * *
// phút - giờ - ngày - tháng - thứ
//1. phút 0-59
//2. giờ 0-23
//3. ngày trong tháng 1-31
//4. tháng 1-12
//5. ngày trong tuần 0-6 (chủ nhật là 0 hoặc 7)

// lịch chạy xóa ảnh cũ hơn 30 ngày vào lúc 0:00 mỗi Chủ Nhật hàng tuần
cron.schedule(
  "0 0 * * 0",
  async () => {
    if (devEnvironment) console.log("--- Đang kiểm tra ảnh cũ để xóa ---");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const oldImages = await OrderImage.findAll({
        where: { createdAt: { [Op.lte]: thirtyDaysAgo } },
      });

      if (oldImages.length === 0) return;
      const publicIds = oldImages.map((img) => img.publicId);

      await cloudinary.api.delete_resources(publicIds);
      await OrderImage.destroy({ where: { publicId: publicIds } });

      if (devEnvironment) console.log(`✅ Đã xóa ${oldImages.length} ảnh cũ`);
    } catch (error) {
      console.error("[CRON ERROR] Lỗi khi xóa ảnh cũ:", error);
    }
  },
  { timezone: TIMEZONE },
);

// Lịch chạy vào lúc 23:59 mỗi ngày để chốt công nợ tự động
cron.schedule(
  "59 23 * * *",
  //   "*/10 * * * * *",
  async () => {
    const startTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    console.log(`\n======================================================`);
    console.log(`[CRONJOB] [${startTime}] --- BẮT ĐẦU CHỐT CÔNG NỢ TỰ ĐỘNG ---`);

    try {
      const result = await debtManagementService.processAutoDebtClosing();

      console.log(`[CRONJOB SUCCESS] ${result.message}`);
      console.log(`Thời gian xử lý: ${result.processedAt}`);
    } catch (error) {
      console.error(`[CRONJOB ERROR] [${startTime}] Lỗi khi chạy chốt công nợ:`, error);
    }
  },
  { timezone: TIMEZONE },
);

// Lịch chạy để end ca làm việc cho QC, 1 tiếng check 1 lần
cron.schedule(
  "0 * * * *",
  // "*/10 * * * * *", // Dùng cho dev test nhanh
  async () => {
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 giờ trước

      console.log(`\n=========================CRONJOB=============================`);
      console.log(`----- KIỂM TRA VÀ KẾT THÚC CA LÀM VIỆC QC -----`);

      const [affectedRows] = await QcShift.update(
        { isActive: false, endedAt: new Date() },
        { where: { isActive: true, startedAt: { [Op.lte]: twelveHoursAgo } } },
      );

      if (affectedRows > 0) {
        console.log(
          `✅ Đã tự động kết thúc ${affectedRows} ca làm việc QC đã hoạt động quá 12 giờ.`,
        );
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra ca làm việc:", error);
    }
  },
  { timezone: TIMEZONE },
);
