"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportWarehouseSale = exportWarehouseSale;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const outboundHistory_1 = require("../../models/warehouse/outboundHistory");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const product_1 = require("../../models/product/product");
const appError_1 = require("../appError");
const user_1 = require("../../models/user/user");
const outboundDetail_1 = require("../../models/warehouse/outboundDetail");
const FONT_REGULAR = path_1.default.join(process.cwd(), "assest/fonts/NotoSerif-Regular.ttf");
const FONT_BOLD = path_1.default.join(process.cwd(), "assest/fonts/NotoSerif-Bold.ttf");
const FONT_ITALIC = path_1.default.join(process.cwd(), "assest/fonts/NotoSerif-Italic.ttf");
const FONT_BOLD_ITALIC = path_1.default.join(process.cwd(), "assest/fonts/NotoSerif-BoldItalic.ttf");
async function exportWarehouseSale(res, outboundId) {
    const outbound = await outboundHistory_1.OutboundHistory.findOne({
        where: { outboundId },
        attributes: { exclude: ["createdAt", "updatedAt", "totalOutboundQty"] },
        include: [
            {
                model: outboundDetail_1.OutboundDetail,
                as: "detail",
                attributes: { exclude: ["createdAt", "updatedAt", "deliveredQty", "outboundId"] },
                include: [
                    {
                        model: order_1.Order,
                        attributes: [
                            "orderId",
                            "flute",
                            "QC_box",
                            "quantityCustomer",
                            "lengthPaperCustomer",
                            "paperSizeCustomer",
                            "dvt",
                            "discount",
                            "vat",
                            "pricePaper",
                        ],
                        include: [
                            {
                                model: customer_1.Customer,
                                attributes: ["customerName", "companyName", "companyAddress", "mst", "phone"],
                            },
                            { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                            { model: user_1.User, attributes: ["fullName"] },
                        ],
                    },
                ],
            },
        ],
    });
    if (!outbound)
        throw appError_1.AppError.NotFound("Outbound not found", "OUTBOUND_NOT_FOUND");
    return buildWarehouseSalePDF({
        res,
        outbound,
    });
}
function buildWarehouseSalePDF({ res, outbound }) {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const fileName = `phieu_xuat_kho_${dateStr}_${outbound.outboundId}.pdf`;
    // ✅ HEADER GIỐNG EXCEL
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    const doc = new pdfkit_1.default({ size: "A4", margin: 40, font: FONT_REGULAR });
    doc.pipe(res);
    /* ===== HEADER ===== */
    doc
        .font(FONT_REGULAR)
        .fontSize(12)
        .text("CHI NHÁNH CÔNG TY CỔ PHẦN BAO BÌ GIẤY ĐỒNG TÂM\n" +
        "Ấp Rừng Sến, Xã Đức Lập, Tỉnh Tây Ninh, Việt Nam", {
        align: "left",
        lineGap: 4,
    });
    doc.moveDown(1);
    doc.font(FONT_BOLD).fontSize(16).text("PHIẾU XUẤT KHO BÁN HÀNG", { align: "center" });
    doc
        .font(FONT_BOLD_ITALIC)
        .fontSize(11)
        .text(`Ngày ${formatDate(outbound.dateOutbound)}`, { align: "center" });
    doc.font(FONT_BOLD).fontSize(11).text(`Số: ${outbound.outboundSlipCode}`, { align: "center" });
    /* ===== CUSTOMER INFO ===== */
    const firstDetail = outbound.detail?.[0];
    if (!firstDetail) {
        throw new Error("Outbound has no detail");
    }
    const order = firstDetail.Order;
    const customer = order.Customer;
    const saleUser = order.User;
    doc.moveDown(1);
    doc.font(FONT_REGULAR).fontSize(11).lineGap(6);
    doc.text(`Người mua: ${customer.customerName}`);
    doc.text(`Tên khách hàng: ${customer.companyName}`);
    doc.text(`Địa chỉ: ${customer.companyAddress}`);
    doc.text(`Điện thoại: ${customer.phone}`);
    doc.text(`Mã số thuế: ${customer.mst}`);
    doc.text(`Diễn giải: Bán hàng ${customer.companyName}`);
    doc.text(`Nhân viên bán hàng: ${saleUser.fullName}`);
    /* ===== TABLE ===== */
    doc.moveDown(1);
    drawItemTable(doc, outbound);
    // ===== SỐ TIỀN BẰNG CHỮ =====
    const amountInWords = numberToVietnamese(outbound.totalPricePayment ?? 0);
    const leftX = 40;
    const rightX = doc.page.width - 40;
    doc.font(FONT_REGULAR).fontSize(11);
    doc.text("Số tiền viết bằng chữ:", leftX, doc.y).fontSize(11);
    doc
        .font(FONT_BOLD_ITALIC)
        .fontSize(11)
        .text(amountInWords, leftX + 120, doc.y - 21, {
        width: rightX - leftX - 140,
    });
    /* ===== SIGN ===== */
    drawSignArea(doc);
    doc.end();
}
function drawTableRow({ doc, y, row, colX, colW, tableLeft, tableRight, isHeader = false, bold = false, }) {
    doc.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(10);
    let maxHeight = 0;
    const heights = [];
    // đo height từng cell
    row.forEach((text, i) => {
        const h = doc.heightOfString(String(text ?? ""), {
            width: colW[i],
        });
        heights[i] = h;
        maxHeight = Math.max(maxHeight, h);
    });
    const rowH = Math.max(26, maxHeight + 10);
    // vẽ text
    const CELL_PADDING_X = 4;
    row.forEach((text, i) => {
        let align = "left";
        let textY = y;
        if (isHeader) {
            align = "center";
            textY = y + (rowH - heights[i]) / 2;
        }
        else {
            align = i >= 4 ? "right" : "left";
            const isNameCol = i === 2;
            textY = isNameCol ? y + 4 : y + (rowH - heights[i]) / 2;
        }
        const textX = colX[i] + CELL_PADDING_X;
        const textWidth = colW[i] - CELL_PADDING_X * 2;
        doc.text(String(text ?? ""), textX, textY, {
            width: textWidth,
            align,
        });
    });
    // line ngang
    doc
        .moveTo(tableLeft, y + rowH)
        .lineTo(tableRight, y + rowH)
        .stroke();
    return rowH;
}
function drawSummaryRow({ doc, y, label, value, tableLeft, amountColX, tableRight, alignLeft = false, }) {
    const rowH = 24;
    const paddingX = 6;
    doc.font(FONT_REGULAR).fontSize(10);
    // label
    doc.text(label, tableLeft + paddingX, y + 6, {
        width: amountColX - tableLeft - paddingX * 2,
        align: alignLeft ? "left" : "right",
    });
    // value
    doc.text(value, amountColX + paddingX, y + 6, {
        width: tableRight - amountColX - paddingX * 2,
        align: "right",
    });
    // line ngang
    doc
        .moveTo(tableLeft, y + rowH)
        .lineTo(tableRight, y + rowH)
        .stroke();
    return rowH;
}
function drawItemTable(doc, outbound) {
    const items = Array.isArray(outbound.detail)
        ? outbound.detail
        : outbound.detail
            ? [outbound.detail]
            : [];
    const startY = doc.y;
    const startX = 40;
    const colW = [30, 80, 150, 75, 65, 60, 75];
    const colX = colW.reduce((acc, w, i) => {
        acc.push(i === 0 ? startX : acc[i - 1] + colW[i - 1]);
        return acc;
    }, []);
    const tableLeft = startX;
    const tableRight = colX[colX.length - 1] + colW[colW.length - 1];
    doc.lineWidth(0.8);
    const fmt = (v) => Number(v || 0).toLocaleString("vi-VN");
    let currentY = startY;
    // ===== HEADER =====
    currentY += drawTableRow({
        doc,
        y: currentY,
        row: ["STT", "Mã Đơn hàng", "Tên Hàng", "Đơn Vị Tính", "Số Lượng", "Đơn Giá", "Thành Tiền"],
        colX,
        colW,
        tableLeft,
        tableRight,
        isHeader: true,
        bold: true,
    });
    // ===== BODY =====
    items.forEach((item, index) => {
        const order = item.Order;
        const lengthCode = formatDimension(order.lengthPaperCustomer ?? 0);
        const sizeCode = formatDimension(order.paperSizeCustomer ?? 0);
        const qcBox = order.QC_box != null ? `(${order.QC_box})` : "";
        const rowH = drawTableRow({
            doc,
            y: currentY,
            row: [
                String(index + 1),
                order.orderId,
                `${order.Product.productName ?? ""}:${lengthCode}x${sizeCode} ${qcBox}`,
                order.dvt,
                fmt(item.outboundQty),
                fmt(order.pricePaper),
                fmt(item.totalPriceOutbound),
            ],
            colX,
            colW,
            tableLeft,
            tableRight,
        });
        currentY += rowH;
    });
    //sumary
    const summaryStartY = currentY;
    const amountColX = colX[colW.length - 1];
    currentY += drawSummaryRow({
        doc,
        y: currentY,
        label: "Cộng tiền hàng:",
        value: fmt(outbound.totalPriceOrder ?? 0),
        tableLeft,
        amountColX,
        tableRight,
        alignLeft: true,
    });
    const rowH = 24;
    const paddingX = 6;
    const leftBlockWidth = amountColX - tableLeft;
    const col1 = leftBlockWidth * 0.4;
    const col2 = leftBlockWidth * 0.1;
    const col3 = leftBlockWidth * 0.3;
    // 1️⃣ Label Thuế suất
    doc.text("Thuế suất GTGT:", tableLeft + paddingX, currentY + 6, {
        width: col1 - paddingX,
        align: "left",
    });
    // 2️⃣ Giá trị %
    doc.text(`${outbound.detail?.[0]?.Order?.vat ?? 0}%`, tableLeft + col1, currentY + 6, {
        width: col2 - paddingX,
        align: "right",
    });
    // 3️⃣ Label Tiền thuế
    doc.text("Tiền thuế GTGT:", tableLeft + col1 + col2 + paddingX, currentY + 6, {
        width: col3 - paddingX * 2,
        align: "left",
    });
    // 4️⃣ Giá trị tiền thuế (cột Thành tiền)
    doc.text(fmt(outbound.totalPriceVAT ?? 0), amountColX + paddingX, currentY + 6, {
        width: tableRight - amountColX - paddingX * 2,
        align: "right",
    });
    // Line ngang
    doc
        .moveTo(tableLeft, currentY + rowH)
        .lineTo(tableRight, currentY + rowH)
        .stroke();
    currentY += rowH;
    currentY += drawSummaryRow({
        doc,
        y: currentY,
        label: "Tổng tiền thanh toán:",
        value: fmt(outbound.totalPricePayment ?? 0),
        tableLeft,
        amountColX,
        tableRight,
        alignLeft: true,
    });
    const tableBottom = currentY;
    // ===== BORDER DỌC CHO BODY TABLE =====
    colX.forEach((x, i) => {
        if (i === 0)
            return;
        doc.moveTo(x, startY).lineTo(x, summaryStartY).stroke();
    });
    // ===== BORDER NGOÀI =====
    doc.rect(tableLeft, startY, tableRight - tableLeft, tableBottom - startY).stroke();
    doc.y = tableBottom + 10;
}
function numberToVietnamese(num) {
    if (num === 0)
        return "Không đồng";
    const units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const scales = ["", "nghìn", "triệu", "tỷ"];
    function readTriple(n, full) {
        let result = "";
        const hundred = Math.floor(n / 100);
        const ten = Math.floor((n % 100) / 10);
        const unit = n % 10;
        if (hundred > 0) {
            result += units[hundred] + " trăm";
            if (ten === 0 && unit > 0)
                result += " lẻ";
        }
        else if (full && (ten > 0 || unit > 0)) {
            // CHỈ đọc "lẻ", KHÔNG đọc "không trăm"
            if (ten === 0 && unit > 0)
                result += " lẻ";
        }
        if (ten > 1) {
            result += " " + units[ten] + " mươi";
            if (unit === 1)
                result += " mốt";
            else if (unit === 5)
                result += " lăm";
            else if (unit > 0)
                result += " " + units[unit];
        }
        else if (ten === 1) {
            result += " mười";
            if (unit === 5)
                result += " lăm";
            else if (unit > 0)
                result += " " + units[unit];
        }
        else if (ten === 0 && unit > 0 && hundred > 0) {
            result += " " + units[unit];
        }
        return result.trim();
    }
    let str = "";
    let scaleIndex = 0;
    let isFirst = true;
    while (num > 0) {
        const part = num % 1000;
        if (part > 0) {
            const partStr = readTriple(part, !isFirst);
            str = partStr + " " + scales[scaleIndex] + " " + str;
            isFirst = false;
        }
        num = Math.floor(num / 1000);
        scaleIndex++;
    }
    const finalStr = str.trim();
    return finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + " đồng chẵn";
}
function drawSignArea(doc) {
    const startY = doc.y + 20;
    const pageWidth = doc.page.width;
    const margin = 40;
    const usableWidth = pageWidth - margin * 2;
    const colWidth = usableWidth / 3;
    const colX = [margin, margin + colWidth, margin + colWidth * 2];
    doc.fontSize(10);
    // ===== NGÀY THÁNG (CỘT GIÁM ĐỐC) =====
    doc
        .font(FONT_ITALIC)
        .text("Ngày ..... tháng ..... năm ......", colX[2], startY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(11);
    const titleY = startY + 24;
    const signNoteY = titleY + 18;
    // ===== TIÊU ĐỀ =====
    doc.font(FONT_BOLD);
    doc
        .text("Người mua hàng", colX[0], titleY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(11);
    doc
        .text("Kế toán trưởng", colX[1], titleY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(11);
    doc
        .text("Giám đốc", colX[2], titleY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(11);
    // ===== GHI CHÚ KÝ =====
    doc.font(FONT_ITALIC);
    doc
        .text("(Ký, họ tên)", colX[0], signNoteY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(10);
    doc
        .text("(Ký, họ tên)", colX[1], signNoteY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(10);
    doc
        .text("(Ký, họ tên, đóng dấu)", colX[2], signNoteY, {
        width: colWidth,
        align: "center",
    })
        .fontSize(10);
    // đẩy con trỏ xuống để tránh đè nếu còn nội dung
    doc.y = signNoteY + 80;
}
//======================HELPER===========================
function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}
function formatDimension(value) {
    if (value == null)
        return "0000";
    const num = Math.round(value * 10); // 62.5 -> 625
    return String(num).padStart(4, "0");
}
//# sourceMappingURL=exportPDF.js.map