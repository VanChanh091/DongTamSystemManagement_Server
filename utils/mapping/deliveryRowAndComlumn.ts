import ExcelJS from "exceljs";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";

export const deliveryColumns: Partial<ExcelJS.Column>[] = [
  //order
  { key: "orderId", header: "Mã Đơn Hàng" },
  { key: "customerName", header: "Tên Khách Hàng" },
  { key: "productName", header: "Tên Sản Phẩm" },

  { key: "flute", header: "Sóng" },
  { key: "QC_box", header: "Quy Cách" },
  { key: "structure", header: "Kết Cấu Đặt Hàng" },

  { key: "sizeProd", header: "Khổ (SX)", style: { numFmt: "#,##0" } },
  { key: "lengthProd", header: "Dài (SX)", style: { numFmt: "#,##0" } },
  { key: "qtyRegistered", header: "Số Lượng YC", style: { numFmt: "#,##0" } },
  { key: "qtyOutbound", header: "Số Lượng Xuất", style: { numFmt: "#,##0" } },

  { key: "note", header: "Ghi Chú" },
  { key: "dvt", header: "DVT" },
  { key: "volume", header: "Khối Lượng" },
  { key: "vehicleHouse", header: "Nhà Xe" },

  //other
  { key: "sequence", header: "Tài" },
  { key: "vehicleName", header: "Tên Xe" },
];

export const mappingDeliveryRow = (root: any, index: number) => {
  const item = root?.DeliveryItems?.[index] || {};

  const vehicle = item?.Vehicle || {};
  const deliveryRequest = item?.DeliveryRequest || {};
  const planning = deliveryRequest?.PlanningPaper || {};

  const order = planning?.Order || {};
  const customer = order?.Customer || {};
  const product = order?.Product || {};
  const inventory = order?.Inventory || {};

  return {
    // order
    orderId: order.orderId || "",
    customerName: customer.customerName || "",
    productName: product.productName || "",

    flute: order.flute || "",
    QC_box: order.QC_box || "",
    structure: typeof formatterStructureOrder === "function" ? formatterStructureOrder(order) : "",

    lengthProd: `${order.lengthPaperManufacture || 0} cm`,
    sizeProd: `${order.paperSizeManufacture || 0} cm`,
    qtyRegistered: deliveryRequest.qtyRegistered || 0,
    qtyOutbound: inventory.totalQtyOutbound || 0,

    note: item.note || "",
    dvt: order.dvt || "",
    volume: `${deliveryRequest.volume || 0} m3`,
    vehicleHouse: vehicle.vehicleHouse || "",

    //other
    sequence: item.sequence || "",
    vehicleName: vehicle.vehicleName || "",
  };
};
