import ExcelJS from "exceljs";
import { formatDimension } from "../helper/exportPDF";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import { OutboundDetail } from "../../models/warehouse/outboundDetail";

export const outboundDetailColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Mã PXK", key: "outboundSlipCode" },
  { header: "Ngày Xuất", key: "dateOutbound", style: { numFmt: "dd/mm/yyyy" } },

  { header: "Mã Đơn Hàng", key: "orderId" },
  { header: "Tên Khách Hàng", key: "customerName" },

  { header: "Loại Sản Phẩm", key: "typeProduct" },
  { header: "Tên Sản Phẩm", key: "productName" },

  { header: "QC Thùng", key: "QC_box" },
  { header: "QC Giấy", key: "dimension" },
  { header: "DVT", key: "dvt" },

  { header: "Số Lượng Đã Giao", key: "deliveredQty" },
  { header: "Số Lượng Xuất", key: "outboundQty" },

  { header: "Đơn Giá", key: "price", style: { numFmt: "#,##0" } },
  { header: "Chiết Khấu", key: "discount", style: { numFmt: "#,##0" } },
  { header: "Thành Tiền", key: "totalPrice", style: { numFmt: "#,##0" } },

  { header: "Loại", key: "isPromotion" },
];

export const mappingOutboundDetailRow = (item: OutboundDetail, index: number) => {
  const order = item.Order || {};
  const outbound = item.OutboundHistory || {};
  const product = order.Product || {};

  let dimension;

  product?.typeProduct === "Phí Khác"
    ? (dimension = 0)
    : (dimension = `${order?.flute ?? ""}-${formatDimension(order?.lengthPaperManufacture)}x${formatDimension(order?.paperSizeManufacture)}`);

  return {
    index: index + 1,
    outboundSlipCode: outbound.outboundSlipCode || "",
    dateOutbound: outbound.dateOutbound ? dayjsUtc(outbound.dateOutbound).format("DD/MM/YYYY") : "",

    orderId: order.orderId || "",
    customerName: order?.Customer?.customerName || "",

    typeProduct: order?.Product?.typeProduct || "",
    productName: order?.Product?.productName || "",

    QC_box: order.QC_box || "",
    dimension: dimension || "",
    dvt: order.dvt || "",

    deliveredQty: item.deliveredQty || 0,
    outboundQty: item.outboundQty || 0,

    price: item.price || 0,
    discount: order.discount || 0,
    totalPrice: item.totalPriceOutbound || 0,

    isPromotion: item.isPromotion ? "Khuyến Mãi" : "Hàng Bán",
  };
};
