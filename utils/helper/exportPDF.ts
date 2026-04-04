import path from "path";
import PDFDocument from "pdfkit";
import { Response } from "express";
import { AppError } from "../appError";
import { warehouseRepository } from "../../repository/warehouseRepository";

const FONT_REGULAR = path.join(process.cwd(), "assest/fonts/NotoSerif-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "assest/fonts/NotoSerif-Bold.ttf");
const FONT_ITALIC = path.join(process.cwd(), "assest/fonts/NotoSerif-Italic.ttf");
const FONT_BOLD_ITALIC = path.join(process.cwd(), "assest/fonts/NotoSerif-BoldItalic.ttf");

export async function exportWarehouse(res: Response, outboundId: number) {
  const outbound = await warehouseRepository.findOneForExportPDF(outboundId);
  if (!outbound) throw AppError.NotFound("Outbound not found", "OUTBOUND_NOT_FOUND");

  return buildWarehouseSalePDF({
    res,
    outbound,
  });
}

function buildWarehouseSalePDF({ res, outbound }: { res: Response; outbound: any }) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const fileName = `phieu_xuat_kho_${dateStr}_${outbound.outboundId}.pdf`;

  // ✅ HEADER GIỐNG EXCEL
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ size: "A4", margin: 40, font: FONT_REGULAR });

  doc.pipe(res);

  /* ===== HEADER ===== */
  doc
    .font(FONT_REGULAR)
    .fontSize(12)
    .text(
      "CHI NHÁNH CÔNG TY CỔ PHẦN BAO BÌ GIẤY ĐỒNG TÂM\n" +
        "Ấp Rừng Sến, Xã Đức Lập, Tỉnh Tây Ninh, Việt Nam",
      {
        align: "left",
        lineGap: 4,
      },
    );

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

function drawTableRow({
  doc,
  y,
  row,
  colX,
  colW,
  tableLeft,
  tableRight,
  isHeader = false,
  bold = false,
}: {
  doc: PDFKit.PDFDocument;
  y: number;
  row: string[];
  colX: number[];
  colW: number[];
  tableLeft: number;
  tableRight: number;
  isHeader?: boolean;
  bold?: boolean;
}): number {
  doc.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(10);

  const CELL_PADDING_X = 5;
  const CELL_PADDING_Y = 10; // Khoảng cách đệm trên dưới

  let maxHeight = 0;
  const heights: number[] = [];

  // 1. Đo chiều cao thực tế của từng ô dựa trên chiều rộng cột
  row.forEach((text, i) => {
    const textWidth = colW[i] - CELL_PADDING_X * 2;
    const h = doc.heightOfString(String(text ?? ""), {
      width: textWidth,
      lineGap: 2,
    });
    heights[i] = h;
    maxHeight = Math.max(maxHeight, h);
  });

  // 2. Tính chiều cao dòng (Đảm bảo tối thiểu 26 và có đủ padding)
  const rowH = Math.max(26, maxHeight + CELL_PADDING_Y);

  // 3. Vẽ text
  row.forEach((text, i) => {
    let align: "left" | "right" | "center" = "left";

    if (isHeader) {
      align = "center";
    } else {
      // Cột 0(STT), 3(ĐVT) căn giữa. Cột 4,5,6 (Số lượng, giá, tiền) căn phải. Còn lại căn trái.
      if (i === 0 || i === 3) align = "center";
      else if (i >= 4) align = "right";
      else align = "left";
    }

    // TẤT CẢ CÁC CỘT ĐỀU CĂN GIỮA THEO CHIỀU DỌC (Vertical Center)
    const textHeight = heights[i];
    const textY = y + (rowH - textHeight) / 2;

    const textX = colX[i] + CELL_PADDING_X;
    const textWidth = colW[i] - CELL_PADDING_X * 2;

    doc.text(String(text ?? ""), textX, textY, {
      width: textWidth,
      align,
      lineGap: 2,
    });
  });

  // 4. Vẽ đường kẻ ngang đáy dòng
  doc
    .moveTo(tableLeft, y + rowH)
    .lineTo(tableRight, y + rowH)
    .lineWidth(0.5)
    .stroke();

  return rowH;
}

function drawSummaryRow({
  doc,
  y,
  label,
  value,
  tableLeft,
  amountColX,
  tableRight,
  alignLeft = false,
}: {
  doc: PDFKit.PDFDocument;
  y: number;
  label: string;
  value: string;
  tableLeft: number;
  amountColX: number;
  tableRight: number;
  alignLeft?: boolean;
}): number {
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

function drawItemTable(doc: PDFKit.PDFDocument, outbound: any) {
  const items = Array.isArray(outbound.detail)
    ? outbound.detail
    : outbound.detail
      ? [outbound.detail]
      : [];

  const startY = doc.y;
  const startX = 40;

  const colW = [30, 85, 180, 40, 60, 55, 85];
  const tableName = ["STT", "Mã Đơn hàng", "Tên Hàng", "ĐVT", "Số Lượng", "Đơn Giá", "Thành Tiền"];

  const colX = colW.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? startX : acc[i - 1] + colW[i - 1]);
    return acc;
  }, []);

  const tableLeft = startX;
  const tableRight = colX[colX.length - 1] + colW[colW.length - 1];

  doc.lineWidth(0.8);

  const fmt = (v: number) => Number(v || 0).toLocaleString("vi-VN");

  let currentY = startY;

  // ===== HEADER =====
  currentY += drawTableRow({
    doc,
    y: currentY,
    row: tableName,
    colX,
    colW,
    tableLeft,
    tableRight,
    isHeader: true,
    bold: true,
  });

  // ===== BODY =====
  items.forEach((item: any, index: number) => {
    const order = item.Order;

    const lengthCode = formatDimension(order.lengthPaperCustomer ?? 0);
    const sizeCode = formatDimension(order.paperSizeCustomer ?? 0);
    const qcBox = order.QC_box != "" && order.QC_box != null ? `(${order.QC_box})` : "";

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

  // Label Thuế suất
  doc.text("Thuế suất GTGT:", tableLeft + paddingX, currentY + 6, {
    width: col1 - paddingX,
    align: "left",
  });

  // Giá trị %
  doc.text(`${outbound.detail?.[0]?.Order?.vat ?? 0}%`, tableLeft + col1, currentY + 6, {
    width: col2 - paddingX,
    align: "right",
  });

  // Label Tiền thuế
  doc.text("Tiền thuế GTGT:", tableLeft + col1 + col2 + paddingX, currentY + 6, {
    width: col3 - paddingX * 2,
    align: "left",
  });

  // Giá trị tiền thuế (cột Thành tiền)
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
    if (i === 0) return;
    // Vẽ từ đỉnh Header (startY) xuống tận đáy của danh sách hàng hóa (summaryStartY)
    doc.moveTo(x, startY).lineTo(x, summaryStartY).lineWidth(0.5).stroke();
  });

  // Vẽ thêm đường kẻ dọc ngăn cách cột "Thành tiền" cho phần Summary
  // Điều này giúp phần "Cộng tiền", "Thuế", "Tổng thanh toán" có khung rõ ràng
  doc.moveTo(amountColX, summaryStartY).lineTo(amountColX, tableBottom).lineWidth(0.5).stroke();

  // ===== BORDER NGOÀI (Hình chữ nhật bao quanh toàn bộ bảng) =====
  doc
    .rect(tableLeft, startY, tableRight - tableLeft, tableBottom - startY)
    .lineWidth(0.8)
    .stroke();

  doc.y = tableBottom + 10;
}

function numberToVietnamese(num: number): string {
  if (num === 0) return "Không đồng";

  const units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const scales = ["", "nghìn", "triệu", "tỷ"];

  function readTriple(n: number, isFirstGroup: boolean): string {
    let res = "";
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;

    // 1. Đọc hàng trăm
    if (hundred > 0 || !isFirstGroup) {
      res += units[hundred] + " trăm ";
    }

    // 2. Đọc hàng chục
    if (ten > 1) {
      res += units[ten] + " mươi ";
    } else if (ten === 1) {
      res += "mười ";
    } else if (hundred > 0 && unit > 0) {
      res += "lẻ ";
    } else if (!isFirstGroup && unit > 0) {
      res += "lẻ ";
    }

    // 3. Đọc hàng đơn vị
    if (unit > 0) {
      if (unit === 1 && ten > 1) res += "mốt";
      else if (unit === 5 && ten > 0) res += "lăm";
      else res += units[unit];
    }

    return res.trim();
  }

  let str = "";
  let tempNum = Math.floor(num);
  let groupIdx = 0;

  // Cắt số thành từng nhóm 3 chữ số từ phải sang trái
  const groups: number[] = [];
  while (tempNum > 0) {
    groups.push(tempNum % 1000);
    tempNum = Math.floor(tempNum / 1000);
  }

  for (let i = groups.length - 1; i >= 0; i--) {
    const part = groups[i];
    if (part > 0) {
      // isFirstGroup = true nếu đây là nhóm đầu tiên bên trái có giá trị
      const isFirst = i === groups.length - 1;
      const partStr = readTriple(part, isFirst);
      str += partStr + " " + scales[i] + " ";
    }
  }

  const finalStr = str.trim();
  return finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + " đồng chẵn";
}

function drawSignArea(doc: PDFKit.PDFDocument) {
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
function formatDate(date: Date | string) {
  const d = new Date(date);
  return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function formatDimension(value?: number): string {
  if (value == null) return "0000";

  const num = Math.round(value * 10); // 62.5 -> 625
  return String(num).padStart(4, "0");
}
