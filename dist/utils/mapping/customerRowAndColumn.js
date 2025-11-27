"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingCustomerRow = exports.customerColumns = void 0;
exports.customerColumns = [
    { header: "STT", key: "index" },
    { header: "Mã Khách Hàng", key: "customerId" },
    { header: "MST", key: "mst" },
    { header: "Tên Khách Hàng", key: "customerName" },
    { header: "Số Điện Thoại", key: "phone" },
    { header: "Người Liên Hệ", key: "contactPerson" },
    { header: "Ngày Tạo", key: "dayCreated", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Hạn Mức Công Nợ", key: "debtLimit", style: { numFmt: "#,##0" } },
    { header: "Công Nợ Hiện Tại", key: "debtCurrent", style: { numFmt: "#,##0" } },
    { header: "Hạn Thanh Toán", key: "timePayment", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Tên Công Ty", key: "companyName" },
    { header: "Địa Chỉ Công Ty", key: "companyAddress" },
    { header: "Địa Chỉ Giao Hàng", key: "shippingAddress" },
    { header: "Khoảng Cách", key: "distance" },
    { header: "CSKH", key: "cskh" },
    { header: "Đánh Giá", key: "rateCustomer" },
];
const mappingCustomerRow = (item, index) => ({
    index: index + 1,
    customerId: item.customerId,
    mst: item.mst,
    customerName: item.customerName,
    phone: item.phone,
    contactPerson: item.contactPerson,
    dayCreated: item.dayCreated ? new Date(String(item.dayCreated)) : null,
    debtLimit: Number(item.debtLimit),
    debtCurrent: Number(item.debtCurrent),
    timePayment: item.timePayment ? new Date(String(item.timePayment)) : null,
    companyName: item.companyName,
    companyAddress: item.companyAddress,
    shippingAddress: item.shippingAddress,
    distance: item.distance,
    cskh: item.cskh,
    rateCustomer: item.rateCustomer,
});
exports.mappingCustomerRow = mappingCustomerRow;
//# sourceMappingURL=customerRowAndColumn.js.map