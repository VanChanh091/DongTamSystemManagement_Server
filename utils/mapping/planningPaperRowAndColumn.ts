import { PlanningPaper } from "../../models/planning/planningPaper";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";
import ExcelJS from "exceljs";

export const planningPaperColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Mã Đơn Hàng", key: "orderId" },
  { header: "Ngày Dự Kiến", key: "dateRequestShip", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Ngày Sản Xuất", key: "dayStart", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Kết Cấu Đặt Hàng", key: "structure" },
  { header: "Khổ Cấp Giấy", key: "khoCapGiay" },
  { header: "Sóng", key: "flute" },
  { header: "Số Lượng SX", key: "quantityManu", style: { numFmt: "#,##0" } },
  { header: "Số Lượng Đã SX", key: "qtyProduced", style: { numFmt: "#,##0" } },
  { header: "Số Lượng Còn Lại", key: "quantityRemaining", style: { numFmt: "#,##0" } },
  { header: "Dài", key: "length", style: { numFmt: "#,##0" } },
  { header: "Khổ", key: "size", style: { numFmt: "#,##0" } },
  { header: "Số Con", key: "child" },
  { header: "HD Đặc Biệt", key: "instructSpecial" },
  { header: "Doanh thu", key: "totalPrice", style: { numFmt: "#,##0" } },
];

export const mapPlanningPaperRow = (item: PlanningPaper, index: number) => {
  const orderCell = item.Order || {};

  return {
    index: index + 1,
    orderId: orderCell.orderId,
    customerName: orderCell.Customer.customerName,

    dateRequestShip: new Date(orderCell.dateRequestShipping ?? ""),
    dayStart: new Date(item.dayStart ?? ""),

    structure: formatterStructureOrder(item),
    flute: orderCell.flute,

    quantityManu: orderCell.quantityManufacture,
    qtyProduced: item.qtyProduced ?? 0,
    quantityRemaining: orderCell.quantityManufacture - (item.qtyProduced ?? 0),

    length: `${Number(item.lengthPaperPlanning)} cm`,
    size: `${Number(item.sizePaperPLaning)} cm`,
    child: item.numberChild,
    khoCapGiay: `${item.ghepKho} cm`,

    instructSpecial: orderCell.instructSpecial,
    totalPrice: Number(orderCell.totalPrice),
  };
};
