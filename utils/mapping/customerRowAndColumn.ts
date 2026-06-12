import ExcelJS from "exceljs";
import { Customer } from "../../models/customer/customer";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";

export const customerColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Mã Khách Hàng", key: "customerId" },
  { header: "MST", key: "mst" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Số Điện Thoại", key: "phone" },
  { header: "Người Liên Hệ", key: "contactPerson" },
  { header: "Ngày Tạo", key: "createdAt", style: { numFmt: "dd/mm/yyyy" } },

  { header: "Hạn Mức Công Nợ", key: "debtLimit", style: { numFmt: "#,##0" } },
  { header: "Công Nợ Hiện Tại", key: "debtCurrent", style: { numFmt: "#,##0" } },
  { header: "Hạn Thanh Toán", key: "timePayment", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Kiểu Thanh Toán", key: "paymentType" },
  { header: "Ngày Chốt", key: "closingDate" },

  { header: "Tên Công Ty", key: "companyName" },
  { header: "Địa Chỉ Công Ty", key: "companyAddress" },
  { header: "Địa Chỉ Giao Hàng", key: "shippingAddress" },
  { header: "Khoảng Cách", key: "distance" },
  { header: "CSKH", key: "cskh" },
  { header: "Đánh Giá", key: "rateCustomer" },
];

export const mappingCustomerRow = (item: Customer, index: number) => {
  const payment = item.payment;

  return {
    index: index + 1,
    customerId: item.customerId,
    mst: item.mst,
    customerName: item.customerName,
    phone: item.phone,
    contactPerson: item.contactPerson,
    createdAt: item.createdAt ? dayjsUtc(item.createdAt).format("DD/MM/YYYY") : "",

    debtLimit: Number(payment?.debtLimit ?? 0),
    debtCurrent: Number(payment?.debtCurrent ?? 0),
    timePayment: payment?.timePayment ? dayjsUtc(payment.timePayment).format("DD/MM/YYYY") : "",
    paymentType: payment?.paymentType === "daily" ? "Ngày" : "Tháng",
    closingDate: Number(payment?.closingDate ?? 0),

    companyName: item.companyName,
    companyAddress: item.companyAddress,
    shippingAddress: item.shippingAddress,
    distance: item.distance,
    cskh: item.cskh,
    rateCustomer: item.rateCustomer,
  };
};
