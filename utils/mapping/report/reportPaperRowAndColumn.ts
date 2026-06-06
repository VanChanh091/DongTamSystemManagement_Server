import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { ReportPlanningPaper } from "../../../models/report/reportPlanningPaper";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";
import ExcelJS from "exceljs";

export const reportPaperColumns: Partial<ExcelJS.Column>[] = [
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
  { header: "PL Báo Cáo", key: "qtyWasteRp" },
  { header: "Doanh số", key: "totalPrice", style: { numFmt: "#,##0" } },

  { header: "Thời Gian Chạy", key: "timeRunningProd" },
  { header: "HD Đặc Biệt", key: "HD_special" },

  { header: "Ca Sản Xuất", key: "shiftProduct" },
  { header: "Trưởng Máy", key: "shiftManager" },
  { header: "Người Báo Cáo", key: "reportedBy" },

  { header: "Loại Máy", key: "machine" },
  { header: "Làm Thùng?", key: "hasMadeBox" },
];

export const mapReportPaperRow = (item: ReportPlanningPaper, index: number) => {
  const planningCell = item.PlanningPaper || {};
  const orderCell = planningCell.Order || {};

  return {
    index: index + 1,
    orderId: orderCell.orderId,
    customerName: orderCell.Customer.customerName,

    dayStartProduction: planningCell.dayStart
      ? dayjsUtc(planningCell.dayStart).format("DD/MM/YYYY")
      : "",
    dayReported: item.dayReport ? dayjsUtc(item.dayReport).format("DD/MM/YYYY HH:mm") : "",

    structure: formatterStructureOrder(planningCell),
    flute: orderCell.flute,
    daoXa: orderCell.daoXa,

    length: Number(planningCell.lengthPaperPlanning),
    size: Number(planningCell.sizePaperPLaning),
    child: orderCell.numberChild,
    khoCapGiay: planningCell.ghepKho,

    runningPlanProd: planningCell.runningPlan,
    qtyReported: item.qtyProduced,
    qtyWasteRp: planningCell.qtyWasteNorm,
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
