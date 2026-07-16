import ExcelJS from "exceljs";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";

export interface PlanningExcelColumn extends Partial<ExcelJS.Column> {
  isFull?: boolean;
}

export const planningPaperColumns: PlanningExcelColumn[] = [
  { header: "STT", key: "index" },
  { header: "Mã Đơn Hàng", key: "orderId" },
  { header: "Tên Khách Hàng", key: "customerName" },

  { header: "Ngày Dự Kiến", key: "dateRequestShip", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Ngày Sản Xuất", key: "dayStart", style: { numFmt: "dd/mm/yyyy" } },

  { header: "Kết Cấu Đặt Hàng", key: "structure" },
  { header: "Khổ Cấp Giấy", key: "khoCapGiay" },
  { header: "Sóng", key: "flute" },
  { header: "Dài", key: "length", style: { numFmt: "#,##0" } },
  { header: "Khổ", key: "size", style: { numFmt: "#,##0" } },
  { header: "QC Thùng", key: "qcBox", isFull: true },
  { header: "Cấn Lằn", key: "canLan", isFull: true },
  { header: "Dao Xả", key: "daoXa", isFull: true },
  { header: "Số Con", key: "child" },
  { header: "HD Đặc Biệt", key: "instructSpecial" },

  { header: "Số Lượng SX", key: "quantityManu", style: { numFmt: "#,##0" } },
  { header: "Số Lượng Đã SX", key: "qtyProduced", style: { numFmt: "#,##0" } },
  { header: "Kế Hoạch Chạy", key: "runningPlan", style: { numFmt: "#,##0" } },

  { header: "DVT", key: "dvt", isFull: true },
  { header: "Thời Gian Chạy", key: "timeRunningProd", isFull: true },
  { header: "Ca SX", key: "shiftProduct", isFull: true },
  { header: "Trưởng Máy", key: "shiftManager", isFull: true },

  { header: "Doanh thu", key: "totalPrice", style: { numFmt: "#,##0" } },
];

export const mapPlanningPaperRow = (item: PlanningPaper, index: number) => {
  const orderCell = item.Order || {};
  const leftQty = (item.runningPlan ?? 0) - (item.qtyProduced ?? 0);

  return {
    index: index + 1,
    orderId: orderCell.orderId,
    customerName: orderCell.Customer.customerName,

    dateRequestShip: orderCell.dateRequestShipping
      ? dayjsUtc(orderCell.dateRequestShipping).format("DD/MM/YYYY")
      : "",
    dayStart: item.dayStart ? dayjsUtc(item.dayStart).format("DD/MM/YYYY") : "",

    structure: formatterStructureOrder(item),
    khoCapGiay: `${item.ghepKho} cm`,
    flute: orderCell.flute,
    length: `${Number(item.lengthPaperPlanning)} cm`,
    size: `${Number(item.sizePaperPLaning)} cm`,
    qcBox: orderCell.QC_box ?? "",
    canLan: orderCell.canLan ?? "",
    daoXa: orderCell.daoXa ?? "",
    child: item.numberChild,
    instructSpecial: orderCell.instructSpecial,

    quantityManu: orderCell.quantityManufacture,
    qtyProduced: item.qtyProduced ?? 0,
    runningPlan: leftQty,

    dvt: orderCell.dvt ?? "",
    timeRunningProd: item.timeRunning ? item.timeRunning.slice(0, 5) : "",
    shiftProduct: item.shiftProduction ?? "",
    shiftManager: item.shiftManagement ?? "",

    totalPrice: Number(item.totalPrice),
  };
};
