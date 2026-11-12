"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingInvWipSheetsRow = exports.invWipSheetsColumns = void 0;
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const orderHelpers_1 = require("../../helper/modelHelper/orderHelpers");
exports.invWipSheetsColumns = [
    { key: "index", header: "STT" },
    { key: "orderId", header: "Mã Đơn Hàng" },
    { key: "customerName", header: "Khách Hàng" },
    { key: "productName", header: "Tên Sản Phẩm" },
    { key: "structure", header: "Kết Cấu" },
    { key: "flute", header: "Sóng" },
    { key: "size", header: "Khổ (SX)" },
    { key: "length", header: "Dài (SX)" },
    { key: "qtyProduced", header: "SL Sản Xuất", style: { numFmt: "#,##0" } },
    { key: "qtyRemaining", header: "SL Còn Lại", style: { numFmt: "#,##0" } },
    { key: "dvt", header: "ĐVT" },
    { key: "unitPrice", header: "Đơn Giá", style: { numFmt: "#,##0" } },
    { key: "totalPrice", header: "Giá Trị Tồn", style: { numFmt: "#,##0" } },
    { key: "inboundedAt", header: "Ngày Nhập Kho", style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { key: "hasBox", header: "Làm Thùng?" },
    { key: "status", header: "Trạng Thái" },
];
const mappingInvWipSheetsRow = (item, index) => {
    const order = item.Order;
    const paper = item.PlanningPaper;
    const formatStatus = (status) => {
        switch (status) {
            case "in_wip":
                return "Đang Chờ";
            case "completed":
                return "Hoàn Thành";
            case "canceled":
                return "Hủy";
            default:
                return status;
        }
    };
    return {
        index: index + 1,
        orderId: item.orderId ?? "",
        customerName: order.Customer.customerName ?? "",
        productName: order.Product.productName ?? "",
        structure: typeof orderHelpers_1.formatterStructureOrder === "function" ? (0, orderHelpers_1.formatterStructureOrder)(paper) : "",
        flute: order.flute ?? "",
        size: paper.sizePaperPLaning ?? "",
        length: paper.lengthPaperPlanning ?? "",
        qtyProduced: item.qtyProduced ?? 0,
        qtyRemaining: item.qtyRemaining ?? 0,
        dvt: order.dvt ?? "",
        unitPrice: item.unitPrice ?? 0,
        totalPrice: item.totalPrice ?? 0,
        inboundedAt: item.inboundedAt ? dayjs_config_1.dayjsUtc.tz(item.inboundedAt, dayjs_config_1.VN_TZ).format("DD/MM/YYYY HH:mm") : "",
        hasBox: paper.hasBox ? "Có" : "",
        status: formatStatus(item.status ?? ""),
    };
};
exports.mappingInvWipSheetsRow = mappingInvWipSheetsRow;
//# sourceMappingURL=invWipSheetsRowAndColumn.js.map