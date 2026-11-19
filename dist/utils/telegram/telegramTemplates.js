"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderOverDebtLimitOtpTemplate = exports.orderZeroPriceOtpTemplate = void 0;
/**
 * Template tin nhắn Telegram yêu cầu OTP duyệt đơn hàng có đơn giá 0đ
 */
const orderZeroPriceOtpTemplate = ({ orderId, requesterName, customerName, otp, }) => {
    return `
🚨 <b>YÊU CẦU OTP DUYỆT ĐƠN ĐƠN GIÁ 0Đ</b>

📦 <b>Mã đơn hàng:</b> <code>${orderId}</code>
👤 <b>Người yêu cầu:</b> ${requesterName}
🏢 <b>Khách hàng:</b> ${customerName}
⚠️ <b>Cảnh báo:</b> Đơn hàng có đơn giá <b>0đ</b> cần được xác nhận đặc biệt.

───────────────────────
🔑 <b>MÃ OTP XÁC NHẬN:</b> <code>${otp}</code>
<i>(Mã có hiệu lực trong 30 phút. Chạm vào số để copy)</i>
`.trim();
};
exports.orderZeroPriceOtpTemplate = orderZeroPriceOtpTemplate;
/**
 * Template tin nhắn Telegram yêu cầu OTP duyệt đơn hàng vượt hạn mức công nợ
 */
const orderOverDebtLimitOtpTemplate = ({ orderId, requesterName, customerName, orderPrice, currentDebt, debtLimit, debtToCheck, exceededPercent, otp, }) => {
    return `
🚨 <b>YÊU CẦU OTP DUYỆT ĐƠN VƯỢT HẠN MỨC</b>

📦 <b>Mã đơn hàng:</b> <code>${orderId}</code>
👤 <b>Người yêu cầu:</b> ${requesterName}
🏢 <b>Khách hàng:</b> ${customerName}

💰 <b>Giá trị đơn:</b> ${orderPrice.toLocaleString()} đ
📊 <b>Công nợ hiện tại:</b> ${currentDebt.toLocaleString()} đ
🎯 <b>Hạn mức cấp phép:</b> ${debtLimit.toLocaleString()} đ
⚠️ <b>Nợ sau duyệt:</b> <b>${debtToCheck.toLocaleString()} đ</b> (Vượt ${exceededPercent}%)

───────────────────────
🔑 <b>MÃ OTP XÁC NHẬN:</b> <code>${otp}</code>
<i>(Mã có hiệu lực trong 30 phút. Chạm vào số để copy)</i>
`.trim();
};
exports.orderOverDebtLimitOtpTemplate = orderOverDebtLimitOtpTemplate;
//# sourceMappingURL=telegramTemplates.js.map