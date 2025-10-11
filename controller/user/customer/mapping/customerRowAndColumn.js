export const customerColumns = [
  { header: "STT", key: "index" },
  { header: "Mã Khách Hàng", key: "customerId" },
  { header: "MST", key: "maSoThue" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "SDT", key: "phone" },
  { header: "Người Liên Hệ", key: "contactPerson" },
  { header: "Ngày Tạo", key: "dayCreatedCus" },
  { header: "Hạn Mức Công Nợ", key: "debtLimitCustomer" },
  { header: "Công Nợ Hiện Tại", key: "debtCurrentCustomer" },
  { header: "Hạn Thanh Toán", key: "termPaymentCost" },
  { header: "Tên Công Ty", key: "companyName" },
  { header: "Địa Chỉ Công Ty", key: "companyAddress" },
  { header: "Địa Chỉ Giao Hàng", key: "shippingAddress" },
  { header: "Khoảng Cách", key: "distanceShip" },
  { header: "CSKH", key: "CSKH" },
  { header: "Đánh Giá", key: "rateCustomer" },
];

export const mappingCustomerRow = (item, index) => {
  return {
    index: index + 1,
    customerId: item.customerId,
    maSoThue: item.mst,
    customerName: item.customerName,
    phone: item.phone,
    contactPerson: item.contactPerson,
    dayCreatedCus: item.dayCreated,
    debtLimitCustomer: item,
    debtCurrentCustomer: item,
    termPaymentCost: item,
    companyName: item,
    companyAddress: item,
    shippingAddress: item,
    distanceShip: item,
    CSKH: item,
    rateCustomer: item,
  };
};
