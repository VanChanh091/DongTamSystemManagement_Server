import asyncHandler from "express-async-handler";
import User from "../models/user/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import sendEmail from "../utils/sendMail.js";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis();

const generateJWT = (userId) => {
  return jwt.sign({ id: userId }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
};

const handleSendEmail = async (email, otp) => {
  try {
    await sendEmail(
      email,
      "DongTam System Management",
      `Vui lòng không chia sẻ mã OTP với bất kì ai. Mã OTP của bạn là: ${otp}`
    );
  } catch (error) {
    console.log(error);
  }
};

export const getOtpCode = asyncHandler(async (req, res) => {
  const { email } = req.body;

  //random code
  const otp = Math.round(1000 + Math.random() * 9000);

  const userData = JSON.stringify({ email: email, otp });

  //save new data user into Redis in 5m
  await redis.setex(`user:${email}`, 300, userData);

  // Send OTP email
  handleSendEmail(email, otp);

  return res.status(201).json({ message: "Mã OTP đã được gửi đến bạn" });
});

const checkExistAndMatchOtp = asyncHandler(async (email, res, otpInput) => {
  // check OTP has existing
  const redisUser = await redis.get(`user:${email}`);
  if (!redisUser) {
    return res.status(401).json({ message: "OTP đã hết hạn" });
  }
  const { otp } = JSON.parse(redisUser);
  if (parseInt(otpInput) !== otp) {
    return res.status(401).json({ message: "OTP không đúng" });
  }
});

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPW, otpInput } = req.body;

  const adminRole = email === "admin@gmail.com" ? "admin" : "user";

  // Check if user already exists
  const existingEmail = await User.findOne({ where: { email: email } });
  if (existingEmail) {
    return res.status(401).json({ message: "User already exists" });
  }

  if (password !== confirmPW) {
    return res.status(400).json({ message: "Mật khẩu không khớp" });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  checkExistAndMatchOtp(email, res, otpInput);

  await User.create({
    fullName: fullName,
    email: email,
    password: hashedPassword,
    role: adminRole,
  });

  // delete user from redis
  await redis.del(`user:${email}`);

  return res.status(201).json({ message: "Xác thực thành công!" });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //check email
  const existUser = await User.findOne({ where: { email: email } });
  if (!existUser) {
    return res.status(401).json({ message: "Email không tồn tại" });
  }

  //check password
  const isMatch = await bcrypt.compare(password, existUser.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Mật khẩu không đúng" });
  }

  return res.status(201).json({
    message: "Đăng nhập thành công",
    user: {
      id: existUser.id,
      email: await existUser.email,
    },
    token: generateJWT(existUser.id),
  });
});

export const verifyOTPChangePassword = asyncHandler(async (req, res) => {
  const { email, otpInput } = req.body;

  //check email
  const existingEmail = await User.findOne({ where: { email: email } });
  if (!existingEmail) {
    return res.status(401).json({ message: "Email không tồn tại" });
  }

  checkExistAndMatchOtp(email, res, otpInput);

  return res.status(201).json({ message: "Xác thực thành công!" });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { email, newPassword, confirmNewPW } = req.body;

  // Tìm email trong Redis
  const redisData = await redis.get(`user:${email}`);
  if (!redisData) {
    return res
      .status(401)
      .json({ message: "Email đã hết hạn hoặc không hợp lệ" });
  }

  if (newPassword !== confirmNewPW) {
    return res.status(400).json({ message: "Mật khẩu không khớp" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await User.update({ password: hashedPassword }, { where: { email: email } });

  await redis.del(`user:${email}`);

  return res.status(201).json({ message: "Cập nhật mật khẩu thành công" });
});
