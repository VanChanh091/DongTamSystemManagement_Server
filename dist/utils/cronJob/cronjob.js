"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const orderImage_1 = require("../../models/order/orderImage");
const cloudinary_connect_1 = __importDefault(require("../../assets/configs/connect/cloudinary.connect"));
const debtManagementService_1 = require("../../service/warehouse/debtManagementService");
const qcShift_1 = require("../../models/qualityControl/qcShift");
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
node_cron_1.default.schedule("0 0 * * 0", async () => {
    if (devEnvironment)
        console.log("--- Đang kiểm tra ảnh cũ để xóa ---");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
        const oldImages = await orderImage_1.OrderImage.findAll({
            where: { createdAt: { [sequelize_1.Op.lte]: thirtyDaysAgo } },
        });
        if (oldImages.length === 0)
            return;
        const publicIds = oldImages.map((img) => img.publicId);
        await cloudinary_connect_1.default.api.delete_resources(publicIds);
        await orderImage_1.OrderImage.destroy({ where: { publicId: publicIds } });
        if (devEnvironment)
            console.log(`✅ Đã xóa ${oldImages.length} ảnh cũ`);
    }
    catch (error) {
        console.error("[CRON ERROR] Lỗi khi xóa ảnh cũ:", error);
    }
}, { timezone: TIMEZONE });
// Lịch chạy vào lúc 23:59 mỗi ngày để chốt công nợ tự động
node_cron_1.default.schedule("59 23 * * *", 
//   "*/10 * * * * *",
async () => {
    const startTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    // console.log(`\n======================================================`);
    // console.log(`[CRONJOB] [${startTime}] --- BẮT ĐẦU CHỐT CÔNG NỢ TỰ ĐỘNG ---`);
    try {
        const result = await debtManagementService_1.debtManagementService.processAutoDebtClosing();
        console.log(`[CRONJOB SUCCESS] ${result.message}`);
        console.log(`Thời gian xử lý: ${result.processedAt}`);
    }
    catch (error) {
        console.error(`[CRONJOB ERROR] [${startTime}] Lỗi khi chạy chốt công nợ:`, error);
    }
}, { timezone: TIMEZONE });
// Lịch chạy để end ca làm việc cho QC, 1 tiếng check 1 lần
node_cron_1.default.schedule("0 * * * *", 
// "*/10 * * * * *", // Dùng cho dev test nhanh
async () => {
    try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 giờ trước
        console.log(`\n=========================CRONJOB=============================`);
        console.log(`----- KIỂM TRA VÀ KẾT THÚC CA LÀM VIỆC QC -----`);
        const [affectedRows] = await qcShift_1.QcShift.update({ isActive: false, endedAt: new Date() }, { where: { isActive: true, startedAt: { [sequelize_1.Op.lte]: twelveHoursAgo } } });
        if (affectedRows > 0) {
            console.log(`✅ Đã tự động kết thúc ${affectedRows} ca làm việc QC đã hoạt động quá 12 giờ.`);
        }
    }
    catch (error) {
        console.error("Lỗi khi kiểm tra ca làm việc:", error);
    }
}, { timezone: TIMEZONE });
//# sourceMappingURL=cronjob.js.map