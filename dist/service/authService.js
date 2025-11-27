"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const redisCache_1 = __importDefault(require("../configs/redisCache"));
const jwtHelper_1 = __importDefault(require("../middlewares/jwtHelper"));
const authRepository_1 = require("../repository/authRepository");
const appError_1 = require("../utils/appError");
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const bcrypt_1 = __importDefault(require("bcrypt"));
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
exports.authService = {
    getOtpCode: async (email) => {
        try {
            //random code
            const otp = Math.round(1000 + Math.random() * 9000);
            const userData = JSON.stringify({ email, otp });
            //save new data user into Redis in 5m
            await redisCache_1.default.setex(`user:${email}`, 600, userData);
            // Send OTP email
            handleSendEmail(email, otp);
            return { message: `Mã OTP đã được gửi đến bạn, mã OTP là ${otp}` };
        }
        catch (error) {
            console.error("❌ get otp code failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    register: async (data) => {
        const { fullName, email, password, confirmPW, otpInput, } = data;
        try {
            const existingEmail = await authRepository_1.authRepository.findUserByEmail(email);
            if (existingEmail) {
                throw appError_1.AppError.Conflict("Tài khoản đã tồn tại", "EMAIL_ALREADY_EXISTS");
            }
            if (password !== confirmPW) {
                throw appError_1.AppError.BadRequest("Mật khẩu không khớp", "PASSWORD_MISMATCH");
            }
            const otpCheck = await checkExistAndMatchOtp(email, otpInput);
            if (!otpCheck.success) {
                throw appError_1.AppError.Unauthorized("Sai mã OTP", "INVALID_OTP");
            }
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash(password, salt);
            await authRepository_1.authRepository.createUser({ fullName, email, password: hashedPassword });
            await redisCache_1.default.del(`user:${email}`);
            return { message: "Đăng ký thành công!" };
        }
        catch (error) {
            console.error("❌ register failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    login: async (email, password) => {
        try {
            //check email
            const existUser = await authRepository_1.authRepository.findUserByEmail(email);
            if (!existUser) {
                throw appError_1.AppError.NotFound("Email không tồn tại", "EMAIL_NOT_FOUND");
            }
            //check password
            const isMatch = await bcrypt_1.default.compare(password, existUser.password);
            if (!isMatch) {
                throw appError_1.AppError.Unauthorized("Mật khẩu không đúng", "INVALID_PASSWORD");
            }
            return {
                message: "Đăng nhập thành công",
                user: {
                    userId: existUser.userId,
                    email: existUser.email,
                    role: existUser.role,
                    permissions: existUser.permissions,
                },
                token: (0, jwtHelper_1.default)(existUser),
            };
        }
        catch (error) {
            console.error("❌ login failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    verifyOTPChangePassword: async (email, otpInput) => {
        try {
            const existingEmail = await authRepository_1.authRepository.findUserByEmail(email);
            if (!existingEmail) {
                throw appError_1.AppError.NotFound("Email không tồn tại", "EMAIL_NOT_FOUND");
            }
            const otpCheck = await checkExistAndMatchOtp(email, otpInput);
            if (!otpCheck.success) {
                throw appError_1.AppError.Unauthorized(`${otpCheck.message}`, "INVALID_OTP");
            }
            return { message: "Xác thực thành công!" };
        }
        catch (error) {
            console.error("❌ verify otp failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    changePassword: async (email, newPassword, confirmNewPW) => {
        try {
            const redisData = await redisCache_1.default.get(`user:${email}`);
            if (!redisData) {
                throw appError_1.AppError.Unauthorized("Email đã hết hạn hoặc không hợp lệ", "INVALID_EMAIL");
            }
            if (newPassword !== confirmNewPW) {
                throw appError_1.AppError.BadRequest("Mật khẩu không khớp", "PASSWORD_MISMATCH");
            }
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash(newPassword, salt);
            await authRepository_1.authRepository.updatePassword(email, hashedPassword);
            await redisCache_1.default.del(`user:${email}`);
            return { message: "Cập nhật mật khẩu thành công" };
        }
        catch (error) {
            console.error("❌ change password failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=authService.js.map