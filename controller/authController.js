import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendMail.js";
import dotenv from "dotenv";
dotenv.config();

const generateJWT = (userId) => {
  return jwt.sign({ id: userId }, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });
};

export const register = asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body || {};

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullname,
    email,
    password: hashedPassword,
  });

  // Generate OTP (valid for 10 minutes)
  const otp = crypto.randomInt(100000, 999999).toString();
  newUser.otp = otp;
  newUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  await newUser.save();

  // Send OTP email
  await sendEmail(email, "Xác nhận OTP", `Mã OTP của bạn là: ${otp}`);

  res.status(201).json({
    message: "User created successfully",
    data: {
      id: newUser._id,
      email: newUser.email,
      accessToken: await generateJWT(newUser),
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //check email
  const existUser = await User.findOne({ where: { email } });
  if (!existUser) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  //   check password
  const isMatch = await bcrypt.compare(password, user.password);
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

export const handleSendEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = crypto.randomInt(100000, 999999).toString();
    newUser.otp = otp;
    newUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await sendEmail(email, "Xác thực mã OTP", `Mã OTP của bạn là ${otp}`);

    res.status(201).json({ message: "OTP đã được gửi đến email của bạn" });
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Can not send email" });
  }
};

export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ where: email });
  if (!user || user.otp !== otp || user.otpExpires < new Date()) {
    res.status(400);
    throw new Error("OTP không hợp lệ");
  }

  //   verify successful
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  res.status(201).json({ message: "Xác nhận OTP thành công" });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const existUser = await User.findOne({ email });
  if (!existUser) {
    res.status(400).json({ message: "Email không tìm thấy" });
    throw new Error("User not found");
  }

  if (
    !existUser.otp ||
    existUser.otp !== otp ||
    existUser.expiresIn < new Date()
  ) {
    return res.status(400).json({ message: "OTP không hợp lệ" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  existUser.password = hashedPassword;
  existUser.otp = null;
  existUser.expiresIn = null;

  await existUser.save();

  res.status(2001).json({ message: "Cập nhật mật khẩu thành công" });
});
