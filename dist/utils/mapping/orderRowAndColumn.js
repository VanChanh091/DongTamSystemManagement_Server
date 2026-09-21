"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingOrderRow = exports.orderColumns = void 0;
const orderHelpers_1 = require("../helper/modelHelper/orderHelpers");
const exportPDF_1 = require("../helper/exportPDF");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const centerStyle = {
    alignment: { vertical: "middle", horizontal: "center" },
};
const formattedStatus = (status) => {
    switch (status) {
        case "accept":
            return "Đã duyệt";
        case "planning":
            return "Đã lên kế hoạch";
        case "completed":
            return "Đã hoàn thành";
        default:
            return status;
    }
};
exports.orderColumns = [
    { header: "STT", key: "index" },
    { header: "Mã Đơn Hàng", key: "orderId" },
    { header: "PO Khách", key: "orderIdCustomer" },
    { header: "Ngày Nhận", key: "dayReceive", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Ngày Dự Kiến", key: "dateShipping", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Tên Khách Hàng", key: "customerName" },
    { header: "Tên Công Ty", key: "companyName" },
    { header: "Loại SP", key: "typeProduct" },
    { header: "Tên SP", key: "productName" },
    { header: "Sóng", key: "flute" },
    { header: "Mã Hàng", key: "productCode" },
    { header: "QC Thùng", key: "QC_box" },
    { header: "Kết Cấu Đặt Hàng", key: "structure" },
    { header: "Cấn Lằn", key: "canLan" },
    { header: "Dao Xả", key: "daoXaOrd" },
    { header: "Dài TT", key: "lengthCus" },
    { header: "Dài (SX)", key: "lengthMf" },
    { header: "Khổ TT", key: "sizeCustomer" },
    { header: "Khổ (SX)", key: "sizeManufacture" },
    { header: "Số Lượng TT", key: "quantityCustomer", style: { numFmt: "#,##0" } },
    { header: "Số Lượng (SX)", key: "qtyManufacture", style: { numFmt: "#,##0" } },
    { header: "HD Đặc Biệt", key: "instructSpecial" },
    { header: "Số con", key: "child" },
    { header: "ĐVT", key: "dvt" },
    { header: "Thể tích (m³)", key: "volume" },
    { header: "Diện Tích (m²)", key: "acreage", style: { numFmt: "#,##0" } },
    { header: "Giá m²/pcs", key: "price", style: { numFmt: "#,##0" } },
    { header: "Đơn Giá", key: "pricePaper", style: { numFmt: "#,##0" } },
    { header: "Chiết Khấu", key: "discounts", style: { numFmt: "#,##0" } },
    { header: "Lợi Nhuận", key: "profitOrd", style: { numFmt: "#,##0" } },
    { header: "VAT", key: "vat" },
    { header: "Tổng Tiền", key: "totalPrice", style: { numFmt: "#,##0" } },
    { header: "Tổng Tiền VAT", key: "totalPriceAfterVAT", style: { numFmt: "#,##0" } },
    // Box
    { header: "In Mặt Trước", key: "inMatTruoc" },
    { header: "In Mặt Sau", key: "inMatSau" },
    { header: "Chống Thấm", key: "chongTham", style: centerStyle },
    { header: "Cấn Lằn", key: "canLanBox", style: centerStyle },
    { header: "Cán Màng", key: "canMang", style: centerStyle },
    { header: "Xả", key: "xa", style: centerStyle },
    { header: "Cắt Khe", key: "catKhe", style: centerStyle },
    { header: "Bế", key: "be", style: centerStyle },
    { header: "Dán 1 Mảnh", key: "dan_1_Manh", style: centerStyle },
    { header: "Dán 2 Mảnh", key: "dan_2_Manh", style: centerStyle },
    { header: "Đóng Ghim 1 Mảnh", key: "dongGhimMotManh", style: centerStyle },
    { header: "Đóng Ghim 2 Mảnh", key: "dongGhimHaiManh", style: centerStyle },
    { header: "Đóng Gói", key: "dongGoi" },
    { header: "Mã Khuôn", key: "maKhuon" },
    { header: "Nhân Viên", key: "staffOrder" },
    { header: "Ghi chú", key: "note" },
    { header: "Trạng thái", key: "status" },
];
const mappingOrderRow = (item, index) => {
    const box = item?.box;
    const user = item?.User;
    const length = (0, exportPDF_1.formatDimension)(item.lengthPaperManufacture);
    const size = (0, exportPDF_1.formatDimension)(item.paperSizeManufacture);
    const productName = item.Product?.productName ?? "";
    const typeProduct = item.Product?.typeProduct ?? "";
    const flute = item.flute ?? "";
    const qcBox = item.QC_box ?? "";
    // lọc value cần lấy
    const fluteNumber = flute.replace(/\D/g, "");
    const regex = /\b\d[A-Z](?:[\/]\d[A-Z])*\b/g;
    const matches = productName.match(regex);
    const productCode = matches ? matches[matches.length - 1] : "";
    let producCode;
    if (typeProduct === "Thùng/hộp") {
        producCode = `TH${fluteNumber}L:${qcBox}`;
    }
    else if (typeProduct === "Giấy Quấn Cuồn") {
        producCode = `${item.flute}-${productCode}:K${size}`;
    }
    else if (typeProduct === "Phí Khác") {
        producCode = "";
    }
    else {
        producCode = `${item.flute}-${productCode}:${length}x${size}`;
    }
    return {
        index: index + 1,
        orderId: item.orderId,
        orderIdCustomer: item.orderIdCustomer ?? "",
        dayReceive: item.dayReceiveOrder ? (0, dayjs_config_1.dayjsUtc)(item.dayReceiveOrder).format("DD/MM/YYYY") : "",
        dateShipping: item.dateRequestShipping
            ? (0, dayjs_config_1.dayjsUtc)(item.dateRequestShipping).format("DD/MM/YYYY")
            : "",
        customerName: item.Customer?.customerName ?? "",
        companyName: item.Customer?.companyName ?? "",
        typeProduct: item.Product?.typeProduct ?? "",
        productName: productName,
        flute: flute,
        productCode: producCode,
        QC_box: qcBox,
        structure: (0, orderHelpers_1.formatterStructureOrder)(item),
        canLan: item.canLan ?? "",
        daoXaOrd: item.daoXa ?? "",
        lengthCus: item.lengthPaperCustomer ?? 0,
        lengthMf: item.lengthPaperManufacture ?? 0,
        sizeCustomer: item.paperSizeCustomer ?? 0,
        sizeManufacture: item.paperSizeManufacture ?? 0,
        quantityCustomer: item.quantityCustomer ?? 0,
        qtyManufacture: item.quantityManufacture ?? 0,
        instructSpecial: item.instructSpecial ?? "",
        child: item.numberChild ?? 0,
        dvt: item.dvt ?? "",
        volume: item.volume ?? 0,
        acreage: item.acreage ?? 0,
        price: item.price ?? 0,
        pricePaper: item.pricePaper ?? 0,
        discounts: item.discount ?? 0,
        profitOrd: item.profit ?? 0,
        vat: (item.vat ?? 0) > 0 ? `${item.vat}%` : "0",
        totalPrice: item.totalPrice ?? 0,
        totalPriceAfterVAT: item.totalPriceVAT ?? 0,
        //box
        inMatTruoc: box?.inMatTruoc ?? 0,
        inMatSau: box?.inMatSau ?? 0,
        chongTham: box?.chongTham ? "✅" : "",
        canLanBox: box?.canLan ? "✅" : "",
        canMang: box?.canMang ? "✅" : "",
        xa: box?.Xa ? "✅" : "",
        catKhe: box?.catKhe ? "✅" : "",
        be: box?.be ? "✅" : "",
        dan_1_Manh: box?.dan_1_Manh ? "✅" : "",
        dan_2_Manh: box?.dan_2_Manh ? "✅" : "",
        dongGhimMotManh: box?.dongGhim1Manh ? "✅" : "",
        dongGhimHaiManh: box?.dongGhim2Manh ? "✅" : "",
        dongGoi: box?.dongGoi ?? "",
        maKhuon: box?.maKhuon ?? "",
        staffOrder: user?.fullName ?? "",
        note: item.note ?? "",
        status: formattedStatus(item.status),
    };
};
exports.mappingOrderRow = mappingOrderRow;
//# sourceMappingURL=orderRowAndColumn.js.map