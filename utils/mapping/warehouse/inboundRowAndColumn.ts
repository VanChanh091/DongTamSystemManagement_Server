import { InboundHistory } from "../../../models/warehouse/inboundHistory";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";
import ExcelJS from "exceljs";

export const inboundColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Ngày Nhập", key: "dateInbound", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Mã Đơn Hàng", key: "orderId" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Tên Công Ty", key: "companyName" },
  { header: "Loại Sản Phẩm", key: "typeProduct" },
  { header: "Tên Sản Phẩm", key: "productName" },
  { header: "QC Thùng", key: "QcBox" },
  { header: "Sóng", key: "flute" },
  { header: "Kết Cấu Đặt Hàng", key: "structure" },
  { header: "Khổ (SX)", key: "size" },
  { header: "Dài (SX)", key: "length" },
  { header: "DVT", key: "dvt" },
  { header: "SL Đơn Hàng", key: "qtyManu", style: { numFmt: "#,##0" } },
  { header: "SL Giấy Tấm", key: "qtyPaper", style: { numFmt: "#,##0" } },
  { header: "SL Nhập Kho", key: "qtyInbound", style: { numFmt: "#,##0" } },
  { header: "Người Kiểm Hàng", key: "checkedBy" },
];

export const mappingInboundRow = (item: InboundHistory, index: number) => {
  const order = item.Order;

  return {
    index: index + 1,
    dateInbound: item.dateInbound ?? "",
    orderId: item.orderId ?? "",
    customerName: order.Customer.customerName ?? "",
    companyName: order.Customer.companyName ?? "",
    typeProduct: order.Product.typeProduct ?? "",
    productName: order.Product.productName ?? "",
    QcBox: order.QC_box ?? "",
    flute: order.flute ?? "",
    structure: typeof formatterStructureOrder === "function" ? formatterStructureOrder(order) : "",
    size: order.paperSizeManufacture ?? "",
    length: order.lengthPaperManufacture ?? "",
    dvt: order.dvt ?? "",
    qtyManu: order.quantityManufacture ?? 0,
    qtyPaper: item.qtyPaper ?? 0,
    qtyInbound: item.qtyInbound ?? 0,
    checkedBy: item.QcSession.checkedBy ?? "",
  };
};
