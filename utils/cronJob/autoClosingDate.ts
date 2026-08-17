import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { debtManagementService } from "../../service/warehouse/debtManagementService";

// phút - giờ - ngày - tháng - thứ
cron.schedule(
  "59 23 * * *",
  //   "*/10 * * * * *",
  async () => {
    const startTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    console.log(`\n======================================================`);
    console.log(`[CRONJOB] [${startTime}] --- BẮT ĐẦU CHỐT CÔNG NỢ TỰ ĐỘNG ---`);

    try {
      const result = await debtManagementService.processAutoDebtClosing();

      console.log(`[CRONJOB SUCCESS] ${result.message}`);
      console.log(`Thời gian xử lý: ${result.processedAt}`);
    } catch (error) {
      console.error(`[CRONJOB ERROR] [${startTime}] Lỗi khi chạy chốt công nợ:`, error);
    }
  },
  {
    timezone: "Asia/Ho_Chi_Minh",
  },
);
