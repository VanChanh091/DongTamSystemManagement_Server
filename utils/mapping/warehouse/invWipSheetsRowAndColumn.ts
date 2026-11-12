import ExcelJS from "exceljs";
import { dayjsUtc, VN_TZ } from "../../../assets/configs/dayjs/dayjs.config";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";
import { InventoryWipSheets } from "../../../models/warehouse/inventory/inventory_wip_sheets";

export const invWipSheetsColumns: Partial<ExcelJS.Column>[] = [
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

export const mappingInvWipSheetsRow = (item: InventoryWipSheets, index: number) => {
  const order = item.Order;
  const paper = item.PlanningPaper;

  const formatStatus = (status: string) => {
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

    structure: typeof formatterStructureOrder === "function" ? formatterStructureOrder(paper) : "",
    flute: order.flute ?? "",

    size: paper.sizePaperPLaning ?? "",
    length: paper.lengthPaperPlanning ?? "",

    qtyProduced: item.qtyProduced ?? 0,
    qtyRemaining: item.qtyRemaining ?? 0,

    dvt: order.dvt ?? "",
    unitPrice: item.unitPrice ?? 0,
    totalPrice: item.totalPrice ?? 0,

    inboundedAt: item.inboundedAt ? dayjsUtc.tz(item.inboundedAt, VN_TZ).format("DD/MM/YYYY HH:mm") : "",
    hasBox: paper.hasBox ? "Có" : "",
    status: formatStatus(item.status ?? ""),
  };
};
