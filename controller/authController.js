import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import sendEmail from "../utils/sendMail.js";
import dotenv from "dotenv";
import { Json } from "sequelize/lib/utils";
dotenv.config();

const redis = new Redis();

const generateJWT = (userId) => {
  return jwt.sign({ id: userId }, process.env.SECRET_KEY, {
    expiresIn: "7d",
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

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email: email } });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  //check account exists with redis
  const redisUser = await redis.get(email);
  if (redisUser) {
    return res.status(400).json({ message: "Account already exists" });
  }

  //random code
  const otp = Math.round(1000 + Math.random() * 9000);

  const userData = JSON.stringify({ email: email, otp });

  //save new data user into Redis in 5m
  await redis.setex(`user:${email}`, 300, userData);

  // Send OTP email
  handleSendEmail(email, otp);

  res.status(201).json({ message: "Mã OTP đã được gửi đến bạn" });
});

const checkExistAndMatchOtp = asyncHandler(async (email, res, otpInput) => {
  // check OTP has existing
  const redisUser = await redis.get(`user:${email}`);
  if (!redisUser) {
    return res.status(404).json({ message: "OTP đã hết hạn" });
  }
  const { otp } = JSON.parse(redisUser);
  if (parseInt(otpInput) !== otp) {
    return res.status(401).json({ message: "OTP không đúng" });
  }
});

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPW, otpInput } = req.body;

  // check OTP has existing
  const redisUser = await redis.get(`user:${email}`);
  if (!redisUser) {
    return res.status(404).json({ message: "OTP đã hết hạn" });
  }

  if (password !== confirmPW) {
    return res.status(400).json({ message: "Mật khẩu không khớp" });
  }

  const { otp } = JSON.parse(redisUser);
  if (parseInt(otpInput) !== otp) {
    return res.status(401).json({ message: "OTP không đúng" });
  }

  const adminRole = email === "admin@gmail.com" ? "admin" : "user";

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await User.create({
    fullName: fullName,
    email: email,
    password: hashedPassword,
    role: adminRole,
  });

  // delete user from redis
  await redis.del(`user:${email}`);

  return res.status(200).json({ message: "Xác thực thành công!" });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //check email
  const existUser = await User.findOne({ where: { email: email } });
  if (!existUser) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  //check password
  const isMatch = await bcrypt.compare(password, existUser.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Mật khẩu không đúng" });
  }

  res.status(201).json({
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
  checkExistAndMatchOtp(email, otpInput);

  // delete user from redis
  await redis.del(`user:${email}`);

  return res.status(200).json({ message: "Xác thực thành công!" });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmNewPW } = req.body;

  if (newPassword !== confirmNewPW) {
    return res.status(400).json({ message: "Mật khẩu không khớp" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await User.update(
    {
      password: hashedPassword,
    },
    { where: { userId } }
  );

  res.status(2001).json({ message: "Cập nhật mật khẩu thành công" });
});
