"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramAlertOtp = exports.sendTelegramAlertError = exports.cleanStackTrace = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const appError_1 = require("../appError");
const CHAT_ID = process.env.CHAT_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_OTP_TOKEN = process.env.TELEGRAM_OTP_TOKEN;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const devEnvironment = process.env.NODE_ENV !== "production";
const cleanStackTrace = (stack) => {
    if (!stack)
        return "No stack trace available";
    return stack
        .split("\n")
        .filter((line) => !line.includes("node_modules") && // Loại bỏ lỗi từ thư viện bên thứ 3
        !line.includes("node:internal"))
        .map((line) => line.replace(/.*\\src\\/g, "..\\src\\")) // Rút ngắn đường dẫn (thay src bằng folder chính của bạn)
        .slice(0, 4) // Chỉ lấy 4 dòng đầu tiên quan trọng nhất
        .join("\n");
};
exports.cleanStackTrace = cleanStackTrace;
const sendTelegramAlertError = async (message) => {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios_1.default.post(url, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "Markdown", // Để tin nhắn trông đẹp hơn
        });
    }
    catch (error) {
        console.error("Lỗi khi gửi tin nhắn Telegram:", error);
    }
};
exports.sendTelegramAlertError = sendTelegramAlertError;
const sendTelegramAlertOtp = async (message) => {
    try {
        if (!TELEGRAM_OTP_TOKEN || !TELEGRAM_GROUP_CHAT_ID) {
            throw appError_1.AppError.BadRequest("Missing TELEGRAM_OTP_TOKEN or TELEGRAM_GROUP_CHAT_ID in .env");
        }
        let chatId;
        if (devEnvironment) {
            chatId = CHAT_ID; // Gửi đến cá nhân trong môi trường dev
        }
        else {
            chatId = TELEGRAM_GROUP_CHAT_ID; // Gửi đến nhóm trong môi trường production
        }
        const url = `https://api.telegram.org/bot${TELEGRAM_OTP_TOKEN}/sendMessage`;
        await axios_1.default.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: "HTML", // Để tin nhắn trông đẹp hơn
        });
    }
    catch (error) {
        console.error("Lỗi khi gửi tin nhắn Telegram:", error);
    }
};
exports.sendTelegramAlertOtp = sendTelegramAlertOtp;
//# sourceMappingURL=telegramSendAlert.js.map