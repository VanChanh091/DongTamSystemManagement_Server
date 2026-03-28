import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { AppError } from "./appError";
import { OrderImage } from "../models/order/orderImage";
import { Op } from "sequelize";
import cloudinary from "../assest/configs/connect/cloudinary.config";

const devEnvironment = process.env.NODE_ENV !== "production";

// Lịch chạy vào lúc 0:00 mỗi Chủ Nhật hàng tuần để xóa ảnh cũ hơn 30 ngày
cron.schedule("0 0 * * 0", async () => {
  //* * * * *
  //1. phút 0-59
  //2. giờ 0-23
  //3. ngày trong tháng 1-31
  //4. tháng 1-12
  //5. ngày trong tuần 0-6 (chủ nhật là 0 hoặc 7)

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
    if (devEnvironment) console.error("Lỗi khi xóa ảnh cũ:", error);
    throw AppError.BadRequest("Lỗi khi xóa ảnh cũ");
  }
});
