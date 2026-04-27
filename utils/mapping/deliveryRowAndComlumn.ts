import ExcelJS from "exceljs";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";

export const deliveryColumns: Partial<ExcelJS.Column>[] = [
  //================================PAPER====================================
  { key: "vehicleName", header: "Tên Xe" },
  { key: "licensePlate", header: "Biển Số" },

  //order
  { key: "orderId", header: "Mã Đơn Hàng" },
  { key: "customerName", header: "Tên Khách Hàng" },
  { key: "companyName", header: "Tên Công Ty" },
  { key: "productName", header: "Tên Sản Phẩm" },

  { key: "flute", header: "Sóng" },
  { key: "QC_box", header: "Quy Cách" },
  { key: "structure", header: "Kết Cấu Đặt Hàng" },

  { key: "sizeProd", header: "Khổ (cm)", style: { numFmt: "#,##0" } },
  { key: "lengthProd", header: "Dài (cm)", style: { numFmt: "#,##0" } },
  { key: "quantity", header: "Số Lượng Giao", style: { numFmt: "#,##0" } },

  { key: "dvt", header: "DVT" },
  { key: "volume", header: "Khối Lượng" },

  //vehicle
  { key: "maxPayload", header: "Tải Trọng", style: { numFmt: "#,##0" } },
  { key: "volumeCapacity", header: "Thể Tích Xe" },
  { key: "vehicleHouse", header: "Nhà Xe" },

  //other
  { key: "note", header: "Ghi Chú" },
  { key: "sequence", header: "Tài" },
];

export const mappingDeliveryRow = (root: any, index: number) => {
  const item = root?.DeliveryItems?.[index] || {};

  const vehicle = item?.Vehicle || {};
  const deliveryRequest = item?.DeliveryRequest || {};
  const planning = deliveryRequest?.PlanningPaper || {};

  const order = planning?.Order || {};
  const customer = order?.Customer || {};
  const product = order?.Product || {};

  return {
    vehicleName: vehicle.vehicleName || "",
    licensePlate: vehicle.licensePlate || "",

    // order
    orderId: order.orderId || "",
    customerName: customer.customerName || "",
    companyName: customer.companyName || "",
    productName: product.productName || "",

    flute: order.flute || "",
    QC_box: order.QC_box || "",
    structure: typeof formatterStructureOrder === "function" ? formatterStructureOrder(order) : "",

    lengthProd: `${order.lengthPaperManufacture || 0} cm`,
    sizeProd: `${order.paperSizeManufacture || 0} cm`,
    quantity: deliveryRequest.qtyRegistered || 0,

    dvt: order.dvt || "",
    volume: `${deliveryRequest.volume || 0} m3`,

    // vehicle
    maxPayload: vehicle.maxPayload || 0,
    volumeCapacity: vehicle.volumeCapacity || "",
    vehicleHouse: vehicle.vehicleHouse || "",

    //other
    note: item.note || "",
    sequence: item.sequence || "",
  };
};
