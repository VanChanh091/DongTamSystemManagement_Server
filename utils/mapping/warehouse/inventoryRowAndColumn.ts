import ExcelJS from "exceljs";
import { Inventory } from "../../../models/warehouse/inventory/inventory";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";

export const inventoryColumns: Partial<ExcelJS.Column>[] = [
  { key: "orderId", header: "Mã Đơn Hàng" },

  { key: "customerName", header: "Khách Hàng" },
  { key: "typeProduct", header: "Loại Sản Phẩm" },
  { key: "productName", header: "Tên Sản Phẩm" },

  { key: "flute", header: "Sóng" },
  { key: "structure", header: "Kết Cấu" },

  { key: "size", header: "Khổ (SX)" },
  { key: "length", header: "Dài (SX)" },

  { key: "totalQtyInbound", header: "Tổng Nhập", style: { numFmt: "#,##0" } },
  { key: "totalQtyOutbound", header: "Tổng Xuất", style: { numFmt: "#,##0" } },
  { key: "qtyInventory", header: "Số Lượng Tồn", style: { numFmt: "#,##0" } },

  { key: "dvt", header: "DVT" },
  { key: "price", header: "Đơn Giá", style: { numFmt: "#,##0" } },

  { key: "valueInventory", header: "Giá Trị Tồn", style: { numFmt: "#,##0" } },
  { key: "dateInbound", header: "Ngày Nhập Kho", style: { numFmt: "dd/mm/yyyy hh:mm" } },
];

export const mappingInventoryRow = (item: Inventory, index: number) => {
  const order = item.Order;

  return {
    index: index + 1,
    orderId: order.orderId ?? "",

    customerName: order.Customer.customerName ?? "",
    typeProduct: order.Product.typeProduct ?? "",
    productName: order.Product.productName ?? "",

    flute: order.flute ?? "",
    structure: typeof formatterStructureOrder === "function" ? formatterStructureOrder(order) : "",

    size: order.paperSizeManufacture ?? "",
    length: order.lengthPaperManufacture ?? "",

    totalQtyInbound: item.totalQtyInbound ?? 0,
    totalQtyOutbound: item.totalQtyOutbound ?? 0,
    qtyInventory: item.qtyInventory ?? 0,

    dvt: order.dvt ?? "",
    price: order.pricePaper ?? 0,

    valueInventory: item.valueInventory ?? 0,
    dateInbound: item.dateInbound ? item.dateInbound : null,
  };
};
