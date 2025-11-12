"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.verifyOTPChangePassword = exports.login = exports.register = exports.getOtpCode = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const user_1 = require("../../models/user/user");
const bcrypt_1 = __importDefault(require("bcrypt"));
const sendMail_1 = __importDefault(require("../../utils/sendMail"));
const jwtHelper_1 = __importDefault(require("../../middlewares/jwtHelper"));
const dotenv_1 = __importDefault(require("dotenv"));
const redisCache_1 = __importDefault(require("../../configs/redisCache"));
dotenv_1.default.config();
const handleSendEmail = async (email, otp) => {
    try {
        await (0, sendMail_1.default)(email, "Mã xác thực đăng ký tài khoản", `Vui lòng không chia sẻ mã OTP với bất kì ai. Mã OTP của bạn là: ${otp}. Mã OTP có hiệu lực trong 10 phút.`);
    }
    catch (error) {
        console.log(error);
    }
};
const checkExistAndMatchOtp = async (email, otpInput) => {
    const redisUser = await redisCache_1.default.get(`user:${email}`);
    if (!redisUser) {
        return { success: false, message: "OTP đã hết hạn" };
    }
    const { otp } = JSON.parse(redisUser);
    if (parseInt(String(otpInput), 10) !== otp) {
        return { success: false, message: "OTP không đúng" };
    }
    return { success: true };
};
exports.getOtpCode = (0, express_async_handler_1.default)(async (req, res) => {
    const { email } = req.body;
    //random code
    const otp = Math.round(1000 + Math.random() * 9000);
    const userData = JSON.stringify({ email, otp });
    //save new data user into Redis in 5m
    await redisCache_1.default.setex(`user:${email}`, 600, userData);
    // Send OTP email
    handleSendEmail(email, otp);
    res.status(201).json({ message: `Mã OTP đã được gửi đến bạn, mã OTP là ${otp}` });
});
exports.register = (0, express_async_handler_1.default)(async (req, res) => {
    const { fullName, email, password, confirmPW, otpInput } = req.body;
    const existingEmail = await user_1.User.findOne({ where: { email } });
    if (existingEmail) {
        res.status(401).json({ message: "Tài khoản đã tồn tại" });
        return;
    }
    if (password !== confirmPW) {
        res.status(400).json({ message: "Mật khẩu không khớp" });
        return;
    }
    const otpCheck = await checkExistAndMatchOtp(email, otpInput);
    if (!otpCheck.success) {
        res.status(401).json({ message: "Sai mã OTP" });
        return;
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const hashedPassword = await bcrypt_1.default.hash(password, salt);
    await user_1.User.create({
        fullName,
        email,
        password: hashedPassword,
    });
    await redisCache_1.default.del(`user:${email}`);
    res.status(201).json({ message: "Đăng ký thành công!" });
});
exports.login = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    //check email
    const existUser = await user_1.User.findOne({ where: { email } });
    if (!existUser) {
        res.status(401).json({ message: "Email không tồn tại" });
        return;
    }
    //check password
    const isMatch = await bcrypt_1.default.compare(password, existUser.password);
    if (!isMatch) {
        res.status(401).json({ message: "Mật khẩu không đúng" });
        return;
    }
    console.log({
        userId: existUser.userId,
        email: existUser.email,
        role: existUser.role,
        permissions: existUser.permissions,
    });
    res.status(201).json({
        message: "Đăng nhập thành công",
        user: {
            userId: existUser.userId,
            email: existUser.email,
            role: existUser.role,
            permissions: existUser.permissions,
        },
        token: (0, jwtHelper_1.default)(existUser),
    });
});
exports.verifyOTPChangePassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, otpInput } = req.body;
    const existingEmail = await user_1.User.findOne({ where: { email } });
    if (!existingEmail) {
        res.status(401).json({ message: "Email không tồn tại" });
        return;
    }
    const otpCheck = await checkExistAndMatchOtp(email, otpInput);
    if (!otpCheck.success) {
        res.status(401).json({ message: otpCheck.message });
        return;
    }
    res.status(201).json({ message: "Xác thực thành công!" });
    return;
});
exports.changePassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, newPassword, confirmNewPW } = req.body;
    // Tìm email trong Redis
    const redisData = await redisCache_1.default.get(`user:${email}`);
    if (!redisData) {
        res.status(401).json({ message: "Email đã hết hạn hoặc không hợp lệ" });
        return;
    }
    if (newPassword !== confirmNewPW) {
        res.status(400).json({ message: "Mật khẩu không khớp" });
        return;
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const hashedPassword = await bcrypt_1.default.hash(newPassword, salt);
    await user_1.User.update({ password: hashedPassword }, { where: { email: email } });
    await redisCache_1.default.del(`user:${email}`);
    res.status(201).json({ message: "Cập nhật mật khẩu thành công" });
});
//# sourceMappingURL=authController.js.map