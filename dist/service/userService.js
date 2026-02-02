"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const appError_1 = require("../utils/appError");
const bcrypt_1 = __importDefault(require("bcrypt"));
const converToWebp_1 = require("../utils/image/converToWebp");
const userRepository_1 = require("../repository/userRepository");
exports.userService = {
    updateProfile: async ({ req, userId, newPassword, userUpdated, }) => {
        try {
            const parsedUser = typeof userUpdated === "string" ? JSON.parse(userUpdated) : userUpdated;
            const user = await userRepository_1.userRepository.findUserById(userId);
            if (!user) {
                throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
            }
            // Hash password nếu có newPassword
            if (newPassword) {
                const saltRounds = 10;
                const hashedPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
                userUpdated.password = hashedPassword;
            }
            // Xử lý ảnh nếu có
            if (req.file) {
                const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
                const sanitizeName = user.fullName
                    .normalize("NFD") // tách các dấu
                    .replace(/[\u0300-\u036f]/g, "") // xóa dấu
                    .replace(/\s+/g, "_") // khoảng trắng -> _
                    .replace(/[^\w-]/g, ""); // bỏ ký tự đặc biệt
                const fileName = `${sanitizeName}-userId:${userId}`;
                const result = await (0, converToWebp_1.uploadImageToCloudinary)(webpBuffer, "users", fileName);
                parsedUser.avatar = result.secure_url;
            }
            await user.update(parsedUser);
            const updatedUser = await userRepository_1.userRepository.findUserById(userId);
            const { password, ...sanitizedUser } = updatedUser.toJSON();
            await redisCache_1.default.del("users:all");
            return { message: "Update profile user successfully", data: sanitizedUser };
        }
        catch (error) {
            console.error("Update user error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=userService.js.map