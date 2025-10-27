export const customerColumns = [
  { header: "STT", key: "index" },
  { header: "Mã Khách Hàng", key: "customerId" },
  { header: "MST", key: "mst" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "SDT", key: "phone" },
  { header: "Người Liên Hệ", key: "contactPerson" },
  { header: "Ngày Tạo", key: "dayCreated", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Hạn Mức Công Nợ", key: "debtLimit" },
  { header: "Công Nợ Hiện Tại", key: "debtCurrent" },
  { header: "Hạn Thanh Toán", key: "timePayment", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Tên Công Ty", key: "companyName" },
  { header: "Địa Chỉ Công Ty", key: "companyAddress" },
  { header: "Địa Chỉ Giao Hàng", key: "shippingAddress" },
  { header: "Khoảng Cách", key: "distance" },
  { header: "CSKH", key: "cskh" },
  { header: "Đánh Giá", key: "rateCustomer" },
];

export const mappingCustomerRow = (item, index) => {
  return {
    index: index + 1,
    customerId: item.customerId,
    mst: item.mst,
    customerName: item.customerName,
    phone: item.phone,
    contactPerson: item.contactPerson,
    dayCreated: new Date(item.dayCreated),
    debtLimit: item.debtLimit,
    debtCurrent: item.debtCurrent,
    timePayment: new Date(item.timePayment),
    companyName: item.companyName,
    companyAddress: item.companyAddress,
    shippingAddress: item.shippingAddress,
    distance: item.distance,
    cskh: item.cskh,
    rateCustomer: item.rateCustomer,
  };
};
