import ExcelJS from "exceljs";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";
import { InventoryLog } from "../../../models/warehouse/inventory/inventoryLog";

export const inventoryColumns: Partial<ExcelJS.Column>[] = [
  { key: "index", header: "STT" },
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
];

export const mappingInventoryRow = (item: InventoryLog, index: number) => {
  const inventory = item.Inventory || {};
  const order = item.Order || {};

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

    totalQtyInbound: inventory.totalQtyInbound ?? 0,
    totalQtyOutbound: inventory.totalQtyOutbound ?? 0,
    qtyInventory: item.balanceAfter ?? 0,

    dvt: order.dvt ?? "",
    price: order.pricePaper ?? 0,

    valueInventory: item.valueAfter ?? 0,
  };
};
