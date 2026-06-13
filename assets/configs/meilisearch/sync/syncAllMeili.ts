import {
  syncCustomerToMeili,
  syncDashboardToMeili,
  syncDeliveryRequestToMeili,
  syncEmployeeToMeili,
  syncInboundToMeili,
  syncInventoryToMeili,
  syncOrderToMeili,
  syncOutboundToMeili,
  syncPlanningBoxToMeili,
  syncPlanningPaperToMeili,
  syncProductToMeili,
  syncReportBoxToMeili,
  syncReportPaperToMeili,
  syncScrapReportToMeili,
} from "./syncMeili";

const syncFunctions = [
  syncCustomerToMeili,
  syncProductToMeili,
  syncEmployeeToMeili,
  syncOrderToMeili,
  syncPlanningPaperToMeili,
  syncPlanningBoxToMeili,
  syncInboundToMeili,
  syncOutboundToMeili,
  syncInventoryToMeili,
  syncReportPaperToMeili,
  syncReportBoxToMeili,
  syncDeliveryRequestToMeili,
  syncDashboardToMeili,
  syncScrapReportToMeili,
];

/**
 * Đồng bộ hoặc xóa toàn bộ dữ liệu của tất cả các Index
 * @param isDeleteAll - true: Xóa sạch document, false: Đổ toàn bộ dữ liệu mới vào
 */
export const syncOrDeleteAllDataToMeili = async (isDeleteAll: string) => {
  const action = isDeleteAll === "true" ? "Xóa" : "Đồng bộ";
  console.log(`--- 🔄 Bắt đầu ${action} toàn bộ Meilisearch ---`);

  try {
    // Sử dụng Promise.all để chạy song song (nhanh hơn)
    // hoặc dùng vòng lặp for...of nếu muốn tránh quá tải DB/Meili
    const tasks = syncFunctions.map((fn) => fn(isDeleteAll === "true"));
    const results = await Promise.all(tasks);

    console.log(`--- ✅ Hoàn tất ${action} tất cả. Số tác vụ: ${results.length} ---`);
    return results;
  } catch (error) {
    console.error(`--- ❌ Lỗi khi ${action} toàn bộ dữ liệu:`, error);
    throw error;
  }
};
