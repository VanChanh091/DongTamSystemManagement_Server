import redisCache from "../configs/redisCache";
import generateToken from "../middlewares/jwtHelper";
import { authRepository } from "../repository/authRepository";
import { AppError } from "../utils/appError";
import sendEmail from "../utils/sendMail";
import bcrypt from "bcrypt";

interface RedisUserData {
  email: string;
  otp: number;
}

const handleSendEmail = async (email: string, otp: number) => {
  try {
    await sendEmail(
      email,
      "Mã xác thực đăng ký tài khoản",
      `Vui lòng không chia sẻ mã OTP với bất kì ai. Mã OTP của bạn là: ${otp}. Mã OTP có hiệu lực trong 10 phút.`
    );
  } catch (error) {
    console.log(error);
  }
};

const checkExistAndMatchOtp = async (email: string, otpInput: string | number) => {
  const redisUser = await redisCache.get(`user:${email}`);
  if (!redisUser) {
    return { success: false, message: "OTP đã hết hạn" };
  }

  const { otp } = JSON.parse(redisUser) as RedisUserData;
  if (parseInt(String(otpInput), 10) !== otp) {
    return { success: false, message: "OTP không đúng" };
  }

  return { success: true };
};

export const authService = {
  getOtpCode: async (email: string) => {
    try {
      //random code
      const otp = Math.round(1000 + Math.random() * 9000);

      const userData = JSON.stringify({ email, otp });

      //save new data user into Redis in 5m
      await redisCache.setex(`user:${email}`, 600, userData);

      // Send OTP email
      handleSendEmail(email, otp);

      return { message: `Mã OTP đã được gửi đến bạn, mã OTP là ${otp}` };
    } catch (error) {
      console.error("❌ get otp code failed:", error);
      throw new AppError("get otp code failed", 500);
    }
  },

  register: async (data: any) => {
    const {
      fullName,
      email,
      password,
      confirmPW,
      otpInput,
    }: { fullName: string; email: string; password: string; confirmPW: string; otpInput: number } =
      data;

    try {
      const existingEmail = await authRepository.findUserByEmail(email);
      if (existingEmail) {
        throw new AppError("Tài khoản đã tồn tại", 401);
      }

      if (password !== confirmPW) {
        throw new AppError("Mật khẩu không khớp", 400);
      }

      const otpCheck = await checkExistAndMatchOtp(email, otpInput);
      if (!otpCheck.success) {
        throw new AppError("Sai mã OTP", 401);
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await authRepository.createUser({ fullName, email, password: hashedPassword });

      await redisCache.del(`user:${email}`);

      return { message: "Đăng ký thành công!" };
    } catch (error) {
      console.error("❌ register failed:", error);
      throw new AppError("register failed", 500);
    }
  },

  login: async (email: string, password: string) => {
    try {
      //check email
      const existUser = await authRepository.findUserByEmail(email);
      if (!existUser) {
        throw new AppError("Email không tồn tại", 401);
      }

      //check password
      const isMatch = await bcrypt.compare(password, existUser.password);
      if (!isMatch) {
        throw new AppError("Mật khẩu không đúng", 401);
      }

      return {
        message: "Đăng nhập thành công",
        user: {
          userId: existUser.userId,
          email: existUser.email,
          role: existUser.role,
          permissions: existUser.permissions,
        },
        token: generateToken(existUser),
      };
    } catch (error) {
      console.error("❌ login failed:", error);
      throw new AppError("login failed", 500);
    }
  },

  verifyOTPChangePassword: async (email: string, otpInput: number) => {
    try {
      const existingEmail = await authRepository.findUserByEmail(email);
      if (!existingEmail) {
        throw new AppError("Email không tồn tại", 401);
      }

      const otpCheck = await checkExistAndMatchOtp(email, otpInput);
      if (!otpCheck.success) {
        throw new AppError(`${otpCheck.message}`, 401);
      }

      return { message: "Xác thực thành công!" };
    } catch (error) {
      console.error("❌ verify otp failed:", error);
      throw new AppError("verify otp failed", 500);
    }
  },

  changePassword: async (email: string, newPassword: string, confirmNewPW: string) => {
    try {
      const redisData = await redisCache.get(`user:${email}`);
      if (!redisData) {
        throw new AppError("Email đã hết hạn hoặc không hợp lệ", 500);
      }

      if (newPassword !== confirmNewPW) {
        throw new AppError("Mật khẩu không khớp", 500);
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await authRepository.updatePassword(email, hashedPassword);

      await redisCache.del(`user:${email}`);

      return { message: "Cập nhật mật khẩu thành công" };
    } catch (error) {
      console.error("❌ change password failed:", error);
      throw new AppError("change password failed", 500);
    }
  },
};
