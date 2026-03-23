"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_cron_1 = __importDefault(require("node-cron"));
const appError_1 = require("./appError");
const orderImage_1 = require("../models/order/orderImage");
const sequelize_1 = require("sequelize");
const connectCloudinary_1 = __importDefault(require("../assest/configs/connectCloudinary"));
const devEnvironment = process.env.NODE_ENV !== "production";
// Lịch chạy vào lúc 0:00 mỗi Chủ Nhật hàng tuần để xóa ảnh cũ hơn 30 ngày
node_cron_1.default.schedule("0 0 * * 0", async () => {
    //* * * * *
    //1. phút 0-59
    //2. giờ 0-23
    //3. ngày trong tháng 1-31
    //4. tháng 1-12
    //5. ngày trong tuần 0-6 (chủ nhật là 0 hoặc 7)
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
        await connectCloudinary_1.default.api.delete_resources(publicIds);
        await orderImage_1.OrderImage.destroy({ where: { publicId: publicIds } });
        if (devEnvironment)
            console.log(`✅ Đã xóa ${oldImages.length} ảnh cũ`);
    }
    catch (error) {
        if (devEnvironment)
            console.error("Lỗi khi xóa ảnh cũ:", error);
        throw appError_1.AppError.BadRequest("Lỗi khi xóa ảnh cũ");
    }
});
//# sourceMappingURL=autoDeleteImage.js.map