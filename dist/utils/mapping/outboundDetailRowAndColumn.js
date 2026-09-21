"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingOutboundDetailRow = exports.outboundDetailColumns = void 0;
const exportPDF_1 = require("../helper/exportPDF");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
exports.outboundDetailColumns = [
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
    { header: "VAT", key: "vat", style: { numFmt: "#,##0" } },
    { header: "Thành Tiền", key: "totalPrice", style: { numFmt: "#,##0" } },
    { header: "Thành Tiền (VAT)", key: "totalPriceVAT", style: { numFmt: "#,##0" } },
    { header: "Loại", key: "isPromotion" },
];
const mappingOutboundDetailRow = (item, index) => {
    const order = item.Order || {};
    const outbound = item.OutboundHistory || {};
    const product = order.Product || {};
    let dimension;
    product?.typeProduct === "Phí Khác"
        ? (dimension = 0)
        : (dimension = `${order?.flute ?? ""}-${(0, exportPDF_1.formatDimension)(order?.lengthPaperManufacture)}x${(0, exportPDF_1.formatDimension)(order?.paperSizeManufacture)}`);
    const totalPriceVAT = item.totalPriceOutbound * (1 + (order.vat || 0) / 100);
    return {
        index: index + 1,
        outboundSlipCode: outbound.outboundSlipCode || "",
        dateOutbound: outbound.dateOutbound
            ? dayjs_config_1.dayjsUtc.utc(outbound.dateOutbound).format("DD/MM/YYYY")
            : "",
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
        vat: order.vat || 0,
        totalPrice: item.totalPriceOutbound || 0,
        totalPriceVAT: totalPriceVAT || 0,
        isPromotion: item.isPromotion ? "Khuyến Mãi" : "Hàng Bán",
    };
};
exports.mappingOutboundDetailRow = mappingOutboundDetailRow;
//# sourceMappingURL=outboundDetailRowAndColumn.js.map