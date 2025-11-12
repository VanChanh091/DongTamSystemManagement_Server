"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileUser = void 0;
const user_1 = require("../../../models/user/user");
const bcrypt_1 = __importDefault(require("bcrypt"));
const converToWebp_1 = require("../../../utils/image/converToWebp");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const updateProfileUser = async (req, res) => {
    const { userId } = req.query;
    const { newPassword, userUpdated } = req.body;
    const id = Number(userId);
    const parsedUser = typeof userUpdated === "string" ? JSON.parse(userUpdated) : userUpdated;
    try {
        const user = await user_1.User.findByPk(id);
        if (!user) {
            return res.status(400).json({ message: "User not found" });
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
            const fileName = `${sanitizeName}-userId:${id}`;
            const result = await (0, converToWebp_1.uploadImageToCloudinary)(webpBuffer, "users", fileName);
            parsedUser.avatar = result.secure_url;
        }
        await user.update(parsedUser);
        const updatedUser = await user_1.User.findOne({ where: { userId: id } });
        const { password, ...sanitizedUser } = updatedUser.toJSON();
        await redisCache_1.default.del("users:all");
        return res.status(200).json({
            message: "Update profile user successfully",
            data: sanitizedUser,
        });
    }
    catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ error: error.message });
    }
};
exports.updateProfileUser = updateProfileUser;
//# sourceMappingURL=userController.js.map