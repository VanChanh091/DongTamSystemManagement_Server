import ExcelJS from "exceljs";
import { Inventory } from "../../../models/warehouse/inventory/inventory";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";

export const inventoryColumns: Partial<ExcelJS.Column>[] = [
  { key: "orderId", header: "Mã Đơn Hàng" },
  { key: "customerName", header: "Khách Hàng" },
  { key: "flute", header: "Sóng" },
  { key: "structure", header: "Kết Cấu" },
  { key: "size", header: "Khổ" },
  { key: "length", header: "Dài" },
  { key: "qtyCustomer", header: "Số Lượng" },
  { key: "dvt", header: "DVT" },
  { key: "price", header: "Đơn Giá", style: { numFmt: "#,##0" } },
  { key: "vat", header: "VAT" },
  { key: "totalPrice", header: "Tổng Tiền", style: { numFmt: "#,##0" } },
  { key: "totalPriceVAT", header: "Tổng Tiền VAT", style: { numFmt: "#,##0" } },
  { key: "totalQtyInbound", header: "Tổng Nhập", style: { numFmt: "#,##0" } },
  { key: "totalQtyOutbound", header: "Tổng Xuất", style: { numFmt: "#,##0" } },
  { key: "qtyInventory", header: "Số Lượng Tồn", style: { numFmt: "#,##0" } },
  { key: "valueInventory", header: "Giá Trị Tồn", style: { numFmt: "#,##0" } },
];

export const mappingInventoryRow = (item: Inventory, index: number) => {
  const order = item.Order;

  return {
    index: index + 1,
    orderId: order.orderId ?? "",
    customerName: order.Customer.customerName ?? "",
    flute: order.flute ?? "",
    structure: typeof formatterStructureOrder === "function" ? formatterStructureOrder(order) : "",
    size: order.paperSizeCustomer ?? "",
    length: order.lengthPaperCustomer ?? "",
    qtyCustomer: order.quantityCustomer ?? 0,
    dvt: order.dvt ?? "",
    price: order.pricePaper ?? 0,
    vat: order.vat ?? 0,
    totalPrice: order.totalPrice ?? 0,
    totalPriceVAT: order.totalPriceVAT ?? 0,
    totalQtyInbound: item.totalQtyInbound ?? 0,
    totalQtyOutbound: item.totalQtyOutbound ?? 0,
    qtyInventory: item.qtyInventory ?? 0,
    valueInventory: item.valueInventory ?? 0,
  };
};
