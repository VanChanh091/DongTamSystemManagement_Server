import ExcelJS from "exceljs";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";

export const deliveryColumns: Partial<ExcelJS.Column>[] = [
  //================================PAPER====================================
  { key: "vehicleName", header: "Tên Xe" },

  //order
  { key: "orderId", header: "Mã Đơn Hàng" },
  { key: "customerName", header: "Tên Khách Hàng" },
  { key: "productName", header: "Tên Sản Phẩm" },
  { key: "flute", header: "Sóng" },
  { key: "QC_box", header: "Quy Cách" },
  { key: "structure", header: "Kết Cấu Đặt Hàng" },
  { key: "lengthProd", header: "Dài (cm)", style: { numFmt: "#,##0" } },
  { key: "sizeProd", header: "Khổ (cm)", style: { numFmt: "#,##0" } },
  { key: "quantity", header: "Số Lượng", style: { numFmt: "#,##0" } },
  { key: "qtyInventory", header: "Tồn Kho" },
  { key: "dvt", header: "DVT" },

  //vehicle
  { key: "licensePlate", header: "Biển Số" },
  { key: "maxPayload", header: "Tải Trọng", style: { numFmt: "#,##0" } },
  { key: "volumeCapacity", header: "Thể Tích" },

  //delivery item
  { key: "note", header: "Ghi Chú" },

  //hidden field
  { key: "deliveryDate", header: "Ngày Giao Hàng", style: { numFmt: "dd/mm/yyyy" } },
  { key: "sequence", header: "Tài" },
];

export const mappingDeliveryRow = (root: any, index: number) => {
  const item = root?.DeliveryItems?.[index] || {};

  const vehicle = item?.Vehicle || {};
  const planning = item?.Planning || {};
  const order = planning?.Order || {};
  const customer = order?.Customer || {};
  const product = order?.Product || {};
  const inventory = order?.Inventory || {};

  return {
    vehicleName: vehicle.vehicleName || "",

    orderId: order.orderId || "",
    customerName: customer.customerName || "",
    productName: product.productName || "",

    flute: order.flute || "",
    QC_box: order.QC_box || "",
    structure: formatterStructureOrder(order),
    lengthProd: order.lengthPaperManufacture || 0,
    sizeProd: order.paperSizeManufacture || 0,
    quantity: order.quantityManufacture || 0,
    qtyInventory: inventory.qtyInventory || 0,
    dvt: order.dvt || "",

    licensePlate: vehicle.licensePlate || "",
    maxPayload: vehicle.maxPayload || 0,
    volumeCapacity: vehicle.volumeCapacity || "",

    note: item.note || "",
    sequence: item.sequence || "",
    deliveryDate: root.deliveryDate,
  };
};
