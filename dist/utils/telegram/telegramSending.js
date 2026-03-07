"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanStackTrace = exports.sendTelegramAlert = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const sendTelegramAlert = async (message) => {
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
exports.sendTelegramAlert = sendTelegramAlert;
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
//# sourceMappingURL=telegramSending.js.map