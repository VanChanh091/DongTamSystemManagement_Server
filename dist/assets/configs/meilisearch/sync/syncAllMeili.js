"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOrDeleteAllDataToMeili = void 0;
const syncMeili_1 = require("./syncMeili");
const syncFunctions = [
    syncMeili_1.syncCustomerToMeili,
    syncMeili_1.syncProductToMeili,
    syncMeili_1.syncEmployeeToMeili,
    syncMeili_1.syncOrderToMeili,
    syncMeili_1.syncPlanningPaperToMeili,
    syncMeili_1.syncPlanningBoxToMeili,
    syncMeili_1.syncInboundToMeili,
    syncMeili_1.syncOutboundToMeili,
    syncMeili_1.syncInventoryToMeili,
    syncMeili_1.syncReportPaperToMeili,
    syncMeili_1.syncReportBoxToMeili,
    syncMeili_1.syncDeliveryRequestToMeili,
    syncMeili_1.syncDashboardToMeili,
    syncMeili_1.syncScrapReportToMeili,
];
/**
 * Đồng bộ hoặc xóa toàn bộ dữ liệu của tất cả các Index
 * @param isDeleteAll - true: Xóa sạch document, false: Đổ toàn bộ dữ liệu mới vào
 */
const syncOrDeleteAllDataToMeili = async (isDeleteAll) => {
    const action = isDeleteAll === "true" ? "Xóa" : "Đồng bộ";
    console.log(`--- 🔄 Bắt đầu ${action} toàn bộ Meilisearch ---`);
    try {
        // Sử dụng Promise.all để chạy song song (nhanh hơn)
        // hoặc dùng vòng lặp for...of nếu muốn tránh quá tải DB/Meili
        const tasks = syncFunctions.map((fn) => fn(isDeleteAll === "true"));
        const results = await Promise.all(tasks);
        console.log(`--- ✅ Hoàn tất ${action} tất cả. Số tác vụ: ${results.length} ---`);
        return results;
    }
    catch (error) {
        console.error(`--- ❌ Lỗi khi ${action} toàn bộ dữ liệu:`, error);
        throw error;
    }
};
exports.syncOrDeleteAllDataToMeili = syncOrDeleteAllDataToMeili;
//# sourceMappingURL=syncAllMeili.js.map