import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { AppError } from "../appError";

const CHAT_ID = process.env.CHAT_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_OTP_TOKEN = process.env.TELEGRAM_OTP_TOKEN;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;

export const cleanStackTrace = (stack: string | undefined) => {
  if (!stack) return "No stack trace available";

  return stack
    .split("\n")
    .filter(
      (line) =>
        !line.includes("node_modules") && // Loại bỏ lỗi từ thư viện bên thứ 3
        !line.includes("node:internal"), // Loại bỏ lỗi nội bộ của Node.js
    )
    .map((line) => line.replace(/.*\\src\\/g, "..\\src\\")) // Rút ngắn đường dẫn (thay src bằng folder chính của bạn)
    .slice(0, 4) // Chỉ lấy 4 dòng đầu tiên quan trọng nhất
    .join("\n");
};

export const sendTelegramAlertError = async (message: string) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown", // Để tin nhắn trông đẹp hơn
    });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn Telegram:", error);
  }
};

export const sendTelegramAlertOtp = async (message: string) => {
  try {
    if (!TELEGRAM_OTP_TOKEN || !TELEGRAM_GROUP_CHAT_ID) {
      throw AppError.BadRequest("Missing TELEGRAM_OTP_TOKEN or TELEGRAM_GROUP_CHAT_ID in .env");
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_OTP_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_GROUP_CHAT_ID,
      text: message,
      parse_mode: "HTML", // Để tin nhắn trông đẹp hơn
    });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn Telegram:", error);
  }
};
