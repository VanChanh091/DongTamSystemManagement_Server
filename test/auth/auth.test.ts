import bcrypt from "bcrypt";
import redisCache from "../../configs/redisCache";
import sendEmail from "../../utils/sendMail";
import { authService } from "../../service/authService";
import { authRepository } from "../../repository/authRepository";
import generateToken from "../../middlewares/jwtHelper";

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
    redisCache.setex.mockResolvedValue(true);
    (sendEmail as jest.Mock).mockResolvedValue(true);

    const res = await authService.getOtpCode("test@gmail.com");

    expect(res.message).toContain("Mã OTP đã được gửi");
    expect(redisCache.setex).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });

  //register
  it("register should throw if email already exists", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser());

    await expect(
      authService.register({
        fullName: "A",
        email: "test@gmail.com",
        password: "123",
        confirmPW: "123",
        otpInput: 1234,
      })
    ).rejects.toThrow("Tài khoản đã tồn tại");
  });

  it("register should throw if password mismatch", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.register({
        fullName: "A",
        email: "test@gmail.com",
        password: "111",
        confirmPW: "222",
        otpInput: 1234,
      })
    ).rejects.toThrow("Mật khẩu không khớp");
  });

  it("register should throw if OTP wrong", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (redisCache.get as jest.Mock).mockResolvedValue(redisUserString);

    await expect(
      authService.register({
        fullName: "A",
        email: "test@gmail.com",
        password: "123",
        confirmPW: "123",
        otpInput: 9999, // wrong OTP
      })
    ).rejects.toThrow("Sai mã OTP");
  });

  it("register success", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (redisCache.get as jest.Mock).mockResolvedValue(redisUserString);

    const res = await authService.register({
      fullName: "A",
      email: "test@gmail.com",
      password: "123",
      confirmPW: "123",
      otpInput: 1234,
    });

    expect(res.message).toBe("Đăng ký thành công!");
    expect(authRepository.createUser).toHaveBeenCalled();
    expect(redisCache.del).toHaveBeenCalledWith("user:test@gmail.com");
  });

  //login
  it("login should throw if email not found", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

    await expect(authService.login("vanchanh0730@gmail.com", "123")).rejects.toThrow(
      "Email không tồn tại"
    );
  });

  it("login should throw if password wrong", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser());

    await expect(authService.login("test@gmail.com", "hashed_p")).rejects.toThrow(
      "Mật khẩu không đúng"
    );
  });

  it("login success", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (generateToken as jest.Mock).mockReturnValue("token_abc");

    const res = await authService.login("test@gmail.com", "hashed_pw");

    expect(res.message).toBe("Đăng nhập thành công");
    expect(res.token).toBe("token_abc");
  });

  //verify OTP Change Password
  it("verifyOTPChangePassword should throw if email not exist", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

    await expect(authService.verifyOTPChangePassword("test@gmail.com", 123)).rejects.toThrow(
      "Email không tồn tại"
    );
  });

  it("verifyOTPChangePassword - wrong OTP", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser());
    redisCache.get.mockResolvedValue(redisUserString);

    await expect(authService.verifyOTPChangePassword("a@gmail.com", 9999)).rejects.toThrow(
      "OTP không đúng"
    );
  });

  it("verifyOTPChangePassword success", async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser());
    redisCache.get.mockResolvedValue(redisUserString);

    const res = await authService.verifyOTPChangePassword("a@gmail.com", 1234);

    expect(res.message).toBe("Xác thực thành công!");
  });

  //change Password
  it("changePassword should throw if redis expired", async () => {
    redisCache.get.mockResolvedValue(null);

    await expect(authService.changePassword("abc@gmail.com", "123", "245")).rejects.toThrow(
      "Email không hợp lệ"
    );
  });

  it("changePassword should throw if new password mismatch", async () => {
    redisCache.get.mockResolvedValue(redisUserString);

    await expect(authService.changePassword("abc@gmail.com", "123", "245")).rejects.toThrow(
      "Mật khẩu không khớp"
    );
  });

  it("changePassword success", async () => {
    redisCache.get.mockResolvedValue(redisUserString);

    const res = await authService.changePassword("test@gmail.com", "123", "123");

    expect(res.message).toBe("Cập nhật mật khẩu thành công");
    expect(authRepository.updatePassword).toHaveBeenCalled();
    expect(redisCache.del).toHaveBeenCalledWith("user:test@gmail.com");
  });
});
