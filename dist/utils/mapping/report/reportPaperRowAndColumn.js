"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapReportPaperRow = exports.reportPaperColumns = void 0;
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const orderHelpers_1 = require("../../helper/modelHelper/orderHelpers");
exports.reportPaperColumns = [
    { header: "STT", key: "index" },
    { header: "Mã Đơn Hàng", key: "orderId" },
    { header: "Tên Khách Hàng", key: "customerName" },
    { header: "Ngày Sản Xuất", key: "dayStartProduction", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Ngày Báo Cáo", key: "dayReported", style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { header: "Kết Cấu Đặt Hàng", key: "structure" },
    { header: "Sóng", key: "flute" },
    { header: "Dao Xả", key: "daoXa" },
    { header: "Dài", key: "length", style: { numFmt: "#,##0" } },
    { header: "Khổ", key: "size", style: { numFmt: "#,##0" } },
    { header: "Số Con", key: "child" },
    { header: "Khổ Cấp Giấy", key: "khoCapGiay" },
    { header: "Kế Hoạch Chạy", key: "runningPlanProd" },
    { header: "SL Báo Cáo", key: "qtyReported" },
    { header: "PL Báo Cáo", key: "qtyWasteNorm" },
    { header: "Doanh số", key: "totalPrice", style: { numFmt: "#,##0" } },
    { header: "Thời Gian Chạy", key: "timeRunningProd" },
    { header: "HD Đặc Biệt", key: "HD_special" },
    { header: "Ca Sản Xuất", key: "shiftProduct" },
    { header: "Trưởng Máy", key: "shiftManager" },
    { header: "Người Báo Cáo", key: "reportedBy" },
    { header: "Loại Máy", key: "machine" },
    { header: "Làm Thùng?", key: "hasMadeBox" },
];
const mapReportPaperRow = (item, index) => {
    const planningCell = item.PlanningPaper || {};
    const orderCell = planningCell.Order || {};
    return {
        index: index + 1,
        orderId: orderCell.orderId,
        customerName: orderCell.Customer.customerName,
        dayStartProduction: planningCell.dayStart
            ? dayjs_config_1.dayjsUtc.utc(planningCell.dayStart).format("DD/MM/YYYY")
            : "",
        dayReported: item.dayReport ? dayjs_config_1.dayjsUtc.utc(item.dayReport).format("DD/MM/YYYY HH:mm") : "",
        structure: (0, orderHelpers_1.formatterStructureOrder)(planningCell),
        flute: orderCell.flute,
        daoXa: orderCell.daoXa,
        length: Number(planningCell.lengthPaperPlanning),
        size: Number(planningCell.sizePaperPLaning),
        child: orderCell.numberChild,
        khoCapGiay: planningCell.ghepKho,
        runningPlanProd: planningCell.runningPlan,
        qtyReported: item.qtyProduced,
        qtyWasteNorm: item.qtyWasteNorm,
        totalPrice: Number(item.totalPrice),
        timeRunningProd: planningCell.timeRunning,
        HD_special: orderCell.instructSpecial,
        shiftProduct: item.shiftProduction,
        shiftManager: item.shiftManagement,
        reportedBy: item.reportedBy,
        machine: planningCell.chooseMachine,
        hasMadeBox: planningCell.hasBox ? "Có" : "",
    };
};
exports.mapReportPaperRow = mapReportPaperRow;
//# sourceMappingURL=reportPaperRowAndColumn.js.map