"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_cron_1 = __importDefault(require("node-cron"));
const debtManagementService_1 = require("../../service/warehouse/debtManagementService");
// phút - giờ - ngày - tháng - thứ
node_cron_1.default.schedule("59 23 * * *", 
//   "*/10 * * * * *",
async () => {
    const startTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    console.log(`\n======================================================`);
    console.log(`[CRONJOB] [${startTime}] --- BẮT ĐẦU CHỐT CÔNG NỢ TỰ ĐỘNG ---`);
    try {
        const result = await debtManagementService_1.debtManagementService.processAutoDebtClosing();
        console.log(`[CRONJOB SUCCESS] ${result.message}`);
        console.log(`Thời gian xử lý: ${result.processedAt}`);
    }
    catch (error) {
        console.error(`[CRONJOB ERROR] [${startTime}] Lỗi khi chạy chốt công nợ:`, error);
    }
}, {
    timezone: "Asia/Ho_Chi_Minh",
});
//# sourceMappingURL=autoClosingDate.js.map