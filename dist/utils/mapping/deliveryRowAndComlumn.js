"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingDeliveryRow = exports.deliveryColumns = void 0;
const orderHelpers_1 = require("../helper/modelHelper/orderHelpers");
exports.deliveryColumns = [
    //================================PAPER====================================
    { key: "vehicleName", header: "Tên Xe" },
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
    { key: "qtyInventory", header: "Tồn Kho" },
    { key: "dvt", header: "DVT" },
    { key: "volume", header: "Thể Tích" },
    //vehicle
    { key: "licensePlate", header: "Biển Số" },
    { key: "maxPayload", header: "Tải Trọng", style: { numFmt: "#,##0" } },
    { key: "volumeCapacity", header: "Thể Tích" },
    { key: "vehicleHouse", header: "Nhà Xe" },
    //delivery item
    { key: "note", header: "Ghi Chú" },
    { key: "sequence", header: "Tài" },
];
const mappingDeliveryRow = (root, index) => {
    const item = root?.DeliveryItems?.[index] || {};
    const vehicle = item?.Vehicle || {};
    const deliveryRequest = item?.DeliveryRequest || {};
    const planning = deliveryRequest?.PlanningPaper || {};
    const order = planning?.Order || {};
    const customer = order?.Customer || {};
    const product = order?.Product || {};
    const inventory = order?.Inventory || {};
    return {
        // vehicle
        vehicleName: vehicle.vehicleName || "",
        licensePlate: vehicle.licensePlate || "",
        maxPayload: vehicle.maxPayload || 0,
        volumeCapacity: vehicle.volumeCapacity || "",
        vehicleHouse: vehicle.vehicleHouse || "",
        // order
        orderId: order.orderId || "",
        customerName: customer.customerName || "",
        companyName: customer.companyName || "",
        productName: product.productName || "",
        flute: order.flute || "",
        QC_box: order.QC_box || "",
        dvt: order.dvt || "",
        structure: typeof orderHelpers_1.formatterStructureOrder === "function" ? (0, orderHelpers_1.formatterStructureOrder)(order) : "",
        lengthProd: order.lengthPaperCustomer || 0,
        sizeProd: order.paperSizeCustomer || 0,
        quantity: deliveryRequest.qtyRegistered || 0,
        qtyInventory: inventory.qtyInventory || 0,
        //other
        note: item.note || "",
        sequence: item.sequence || "",
    };
};
exports.mappingDeliveryRow = mappingDeliveryRow;
//# sourceMappingURL=deliveryRowAndComlumn.js.map