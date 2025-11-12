import asyncHandler from "express-async-handler";
import { User } from "../../models/user/user";
import bcrypt from "bcrypt";
import sendEmail from "../../utils/sendMail";
import generateToken from "../../middlewares/jwtHelper";
import dotenv from "dotenv";
import redisCache from "../../configs/redisCache";
import { Request, Response } from "express";
dotenv.config();

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

export const getOtpCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  //random code
  const otp = Math.round(1000 + Math.random() * 9000);

  const userData = JSON.stringify({ email, otp });

  //save new data user into Redis in 5m
  await redisCache.setex(`user:${email}`, 600, userData);

  // Send OTP email
  handleSendEmail(email, otp);

  res.status(201).json({ message: `Mã OTP đã được gửi đến bạn, mã OTP là ${otp}` });
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, confirmPW, otpInput } = req.body;

  const existingEmail = await User.findOne({ where: { email } });
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

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await User.create({
    fullName,
    email,
    password: hashedPassword,
  });

  await redisCache.del(`user:${email}`);

  res.status(201).json({ message: "Đăng ký thành công!" });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  //check email
  const existUser = await User.findOne({ where: { email } });

  if (!existUser) {
    res.status(401).json({ message: "Email không tồn tại" });
    return;
  }

  //check password
  const isMatch = await bcrypt.compare(password, existUser.password);
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
    token: generateToken(existUser),
  });
});

export const verifyOTPChangePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otpInput } = req.body;

    const existingEmail = await User.findOne({ where: { email } });
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
  }
);

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, newPassword, confirmNewPW } = req.body;

  // Tìm email trong Redis
  const redisData = await redisCache.get(`user:${email}`);
  if (!redisData) {
    res.status(401).json({ message: "Email đã hết hạn hoặc không hợp lệ" });
    return;
  }

  if (newPassword !== confirmNewPW) {
    res.status(400).json({ message: "Mật khẩu không khớp" });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await User.update({ password: hashedPassword }, { where: { email: email } });

  await redisCache.del(`user:${email}`);

  res.status(201).json({ message: "Cập nhật mật khẩu thành công" });
});
