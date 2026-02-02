"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const sendMail_1 = __importDefault(require("../../utils/sendMail"));
const authService_1 = require("../../service/authService");
const authRepository_1 = require("../../repository/authRepository");
const jwtHelper_1 = __importDefault(require("../../middlewares/jwtHelper"));
///mocK dependencies
// Mock repo
jest.mock("../../repository/authRepository", () => ({
    authRepository: {
        findUserByEmail: jest.fn(),
        createUser: jest.fn(),
        updatePassword: jest.fn(),
    },
}));
// Mock redis
jest.mock("../../configs/redisCache", () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
    },
}));
// Mock JWT
jest.mock("../../middlewares/jwtHelper", () => ({
    __esModule: true,
    default: jest.fn(),
}));
// Mock sendEmail
jest.mock("../../utils/sendMail", () => ({
    __esModule: true,
    default: jest.fn(),
}));
// Mock bcrypt
jest.mock("bcrypt", () => ({
    genSalt: jest.fn(() => "salt"),
    hash: jest.fn(() => "hashed_pw"),
    compare: jest.fn(),
}));
//mock data
const mockUser = (data = {}) => ({
    userId: 1,
    fullName: "Test",
    email: "test@gmail.com",
    password: "hashed_pw",
    role: "user",
    permissions: ["read"],
    ...data,
});
// Redis value
const redisUserString = JSON.stringify({ email: "test@gmail.com", otp: 1234 });
//test suite
describe("Auth Service", () => {
    beforeEach(() => jest.clearAllMocks());
    //get otp
    it("getOtpCode should save OTP to redis and send email", async () => {
        redisCache_1.default.setex.mockResolvedValue(true);
        sendMail_1.default.mockResolvedValue(true);
        const res = await authService_1.authService.getOtpCode("test@gmail.com");
        expect(res.message).toContain("Mã OTP đã được gửi");
        expect(redisCache_1.default.setex).toHaveBeenCalled();
        expect(sendMail_1.default).toHaveBeenCalled();
    });
    //register
    it("register should throw if email already exists", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser());
        await expect(authService_1.authService.register({
            fullName: "A",
            email: "test@gmail.com",
            password: "123",
            confirmPW: "123",
            otpInput: 1234,
        })).rejects.toThrow("Tài khoản đã tồn tại");
    });
    it("register should throw if password mismatch", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(null);
        await expect(authService_1.authService.register({
            fullName: "A",
            email: "test@gmail.com",
            password: "111",
            confirmPW: "222",
            otpInput: 1234,
        })).rejects.toThrow("Mật khẩu không khớp");
    });
    it("register should throw if OTP wrong", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(null);
        redisCache_1.default.get.mockResolvedValue(redisUserString);
        await expect(authService_1.authService.register({
            fullName: "A",
            email: "test@gmail.com",
            password: "123",
            confirmPW: "123",
            otpInput: 9999, // wrong OTP
        })).rejects.toThrow("Sai mã OTP");
    });
    it("register success", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(null);
        redisCache_1.default.get.mockResolvedValue(redisUserString);
        const res = await authService_1.authService.register({
            fullName: "A",
            email: "test@gmail.com",
            password: "123",
            confirmPW: "123",
            otpInput: 1234,
        });
        expect(res.message).toBe("Đăng ký thành công!");
        expect(authRepository_1.authRepository.createUser).toHaveBeenCalled();
        expect(redisCache_1.default.del).toHaveBeenCalledWith("user:test@gmail.com");
    });
    //login
    it("login should throw if email not found", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(null);
        await expect(authService_1.authService.login("vanchanh0730@gmail.com", "123")).rejects.toThrow("Email không tồn tại");
    });
    it("login should throw if password wrong", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser());
        await expect(authService_1.authService.login("test@gmail.com", "hashed_p")).rejects.toThrow("Mật khẩu không đúng");
    });
    it("login success", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser());
        bcrypt_1.default.compare.mockResolvedValue(true);
        jwtHelper_1.default.mockReturnValue("token_abc");
        const res = await authService_1.authService.login("test@gmail.com", "hashed_pw");
        expect(res.message).toBe("Đăng nhập thành công");
        expect(res.token).toBe("token_abc");
    });
    //verify OTP Change Password
    it("verifyOTPChangePassword should throw if email not exist", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(null);
        await expect(authService_1.authService.verifyOTPChangePassword("test@gmail.com", 123)).rejects.toThrow("Email không tồn tại");
    });
    it("verifyOTPChangePassword - wrong OTP", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser());
        redisCache_1.default.get.mockResolvedValue(redisUserString);
        await expect(authService_1.authService.verifyOTPChangePassword("a@gmail.com", 9999)).rejects.toThrow("OTP không đúng");
    });
    it("verifyOTPChangePassword success", async () => {
        authRepository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser());
        redisCache_1.default.get.mockResolvedValue(redisUserString);
        const res = await authService_1.authService.verifyOTPChangePassword("a@gmail.com", 1234);
        expect(res.message).toBe("Xác thực thành công!");
    });
    //change Password
    it("changePassword should throw if redis expired", async () => {
        redisCache_1.default.get.mockResolvedValue(null);
        await expect(authService_1.authService.changePassword("abc@gmail.com", "123", "245")).rejects.toThrow("Email không hợp lệ");
    });
    it("changePassword should throw if new password mismatch", async () => {
        redisCache_1.default.get.mockResolvedValue(redisUserString);
        await expect(authService_1.authService.changePassword("abc@gmail.com", "123", "245")).rejects.toThrow("Mật khẩu không khớp");
    });
    it("changePassword success", async () => {
        redisCache_1.default.get.mockResolvedValue(redisUserString);
        const res = await authService_1.authService.changePassword("test@gmail.com", "123", "123");
        expect(res.message).toBe("Cập nhật mật khẩu thành công");
        expect(authRepository_1.authRepository.updatePassword).toHaveBeenCalled();
        expect(redisCache_1.default.del).toHaveBeenCalledWith("user:test@gmail.com");
    });
});
//# sourceMappingURL=auth.test.js.map