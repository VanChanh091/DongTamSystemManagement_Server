import redisCache from "../configs/redisCache";
import { User } from "../models/user/user";
import { AppError } from "../utils/appError";
import bcrypt from "bcrypt";
import { convertToWebp, uploadImageToCloudinary } from "../utils/image/converToWebp";
import { Request } from "express";
import { userRepository } from "../repository/userRepository";

export const userService = {
  updateProfile: async ({
    req,
    userId,
    newPassword,
    userUpdated,
  }: {
    req: Request;
    userId: number;
    newPassword: string;
    userUpdated: any;
  }) => {
    try {
      const parsedUser = typeof userUpdated === "string" ? JSON.parse(userUpdated) : userUpdated;

      const user = await userRepository.findUserById(userId);
      if (!user) {
        throw new AppError("User not found", 400);
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

        const fileName = `${sanitizeName}-userId:${userId}`;
        const result = await uploadImageToCloudinary(webpBuffer, "users", fileName);

        parsedUser.avatar = result.secure_url;
      }

      await user.update(parsedUser);

      const updatedUser = await userRepository.findUserById(userId);
      const { password, ...sanitizedUser } = updatedUser!.toJSON();

      await redisCache.del("users:all");

      return { message: "Update profile user successfully", data: sanitizedUser };
    } catch (error) {
      console.error("Update user error:", error);
      throw new AppError("Update user error", 500);
    }
  },
};
