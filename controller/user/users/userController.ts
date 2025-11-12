import { User } from "../../../models/user/user";
import bcrypt from "bcrypt";
import { convertToWebp, uploadImageToCloudinary } from "../../../utils/image/converToWebp";
import redisCache from "../../../configs/redisCache";
import { Request, Response } from "express";

export const updateProfileUser = async (req: Request, res: Response) => {
  const { userId } = req.query as { userId: string };
  const { newPassword, userUpdated } = req.body;

  const id = Number(userId);
  const parsedUser = typeof userUpdated === "string" ? JSON.parse(userUpdated) : userUpdated;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Hash password nếu có newPassword
    if (newPassword) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      userUpdated.password = hashedPassword;
    }

    // Xử lý ảnh nếu có
    if (req.file) {
      const webpBuffer = await convertToWebp(req.file.buffer);

      const sanitizeName = user.fullName
        .normalize("NFD") // tách các dấu
        .replace(/[\u0300-\u036f]/g, "") // xóa dấu
        .replace(/\s+/g, "_") // khoảng trắng -> _
        .replace(/[^\w-]/g, ""); // bỏ ký tự đặc biệt

      const fileName = `${sanitizeName}-userId:${id}`;
      const result = await uploadImageToCloudinary(webpBuffer, "users", fileName);

      parsedUser.avatar = result.secure_url;
    }

    await user.update(parsedUser);

    const updatedUser = await User.findOne({ where: { userId: id } });
    const { password, ...sanitizedUser } = updatedUser!.toJSON();

    await redisCache.del("users:all");

    return res.status(200).json({
      message: "Update profile user successfully",
      data: sanitizedUser,
    });
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message });
  }
};
