import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { Response } from "express";
import { AppError } from "../appError";
import { warehouseRepository } from "../../repository/warehouseRepository";

let LOGO_BUFFER: Buffer;
let FONT_REGULAR_BUFFER: Buffer;
let FONT_BOLD_BUFFER: Buffer;
let FONT_ITALIC_BUFFER: Buffer;
let FONT_BOLD_ITALIC_BUFFER: Buffer;

const header_1 = 13;
const header_2 = 10;
const normal = 9;

try {
  // 1. Load Logo
  LOGO_BUFFER = fs.readFileSync(path.join(process.cwd(), "assets/images/logoDT.jpg"));

  // 2. Load toàn bộ Fonts vào RAM
  FONT_REGULAR_BUFFER = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/NotoSerif-Regular.ttf"),
  );
  FONT_BOLD_BUFFER = fs.readFileSync(path.join(process.cwd(), "assets/fonts/NotoSerif-Bold.ttf"));
  FONT_ITALIC_BUFFER = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/NotoSerif-Italic.ttf"),
  );
  FONT_BOLD_ITALIC_BUFFER = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/NotoSerif-BoldItalic.ttf"),
  );

  // console.log("✅ Tất cả Assets (Logo & Fonts) đã được nạp vào RAM.");
} catch (error) {
  console.error("❌ Không tìm thấy file logo tại đường dẫn:", error);
}

export async function exportWarehouse(res: Response, outboundId: number, hasMoney: boolean) {
  const outbound = await warehouseRepository.findOneForExportPDF(outboundId);
  if (!outbound) throw AppError.NotFound("Outbound not found", "OUTBOUND_NOT_FOUND");

  return buildWarehouseSalePDF({
    res,
    outbound,
    hasMoney,
  });
}

function buildWarehouseSalePDF({
  res,
  outbound,
  hasMoney,
}: {
  res: Response;
  outbound: any;
  hasMoney: boolean;
}) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const fileName = `phieu_xuat_kho_${dateStr}_${outbound.outboundId}.pdf`;

  // HEADER
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ size: "A5", margin: 20, layout: "landscape" });

  // Đăng ký các font từ Buffer với tên định danh
  doc.registerFont("MainRegular", FONT_REGULAR_BUFFER);
  doc.registerFont("MainBold", FONT_BOLD_BUFFER);
  doc.registerFont("MainItalic", FONT_ITALIC_BUFFER);
  doc.registerFont("MainBoldItalic", FONT_BOLD_ITALIC_BUFFER);

  //thiết lập font mặc định
  doc.font("MainRegular");

  doc.pipe(res);

  /* ===== HEADER ===== */

  const marginX = 20;
  const currentY = doc.y;
  const pageWidth = doc.page.width;
  const availableWidth = pageWidth - marginX * 2;

  const logoY = currentY - 10; // Điều chỉnh để căn giữa logo với dòng text bên cạnh
  doc.image(LOGO_BUFFER, marginX, logoY, { width: 60 });
  doc
    .font("MainRegular")
    .fontSize(normal)
    .text(
      "CHI NHÁNH CÔNG TY CỔ PHẦN BAO BÌ GIẤY ĐỒNG TÂM\n" +
        "Ấp Rừng Sến, Xã Đức Lập, Tỉnh Tây Ninh, Việt Nam",
      {
        width: availableWidth,
        align: "right",
        lineGap: 4,
      },
    );

  doc.moveDown(0.6);

  doc.font("MainBold").fontSize(header_1).text("PHIẾU XUẤT KHO BÁN HÀNG", { align: "center" });
  doc
    .font("MainBoldItalic")
    .fontSize(normal)
    .text(`Ngày ${formatDate(outbound.dateOutbound)}`, { align: "center" });
  doc
    .font("MainBold")
    .fontSize(normal)
    .text(`Số: ${outbound.outboundSlipCode}`, { align: "center" });

  doc.moveDown(0.6);

  /* ===== CUSTOMER INFO ===== */

  const firstDetail = outbound.detail?.[0];
  if (!firstDetail) {
    throw AppError.BadRequest("Outbound has no detail", "OUTBOUND_NO_DETAIL");
  }

  const order = firstDetail.Order;
  const customer = order.Customer;

  const infoY = doc.y + 10;

  doc.font("MainRegular").fontSize(normal).lineGap(5);

  doc.text(`Người mua: ${customer.customerName}`, marginX, infoY, { width: 250 });
  doc.text(
    `Điện thoại: ${customer.phone} - MST: ${customer.mst || ".............."}`,
    marginX,
    infoY,
    {
      width: availableWidth,
      align: "right",
    },
  );

  doc.x = marginX;
  doc.y = infoY + 18;

  doc.text(`Tên khách hàng: ${customer.companyName}`);
  doc.text(`Địa chỉ: ${customer.companyAddress}`);
  doc.text(`Diễn giải: Bán hàng ${customer.companyName}`);

  doc.moveDown(0.5);

  /* ===== TABLE ===== */
  drawItemTable(doc, outbound, hasMoney);

  // ===== SỐ TIỀN BẰNG CHỮ =====
  const amountInWords = hasMoney ? numberToVietnamese(outbound.totalPricePayment ?? 0) : "";

  const leftX = 40;
  const rightX = doc.page.width - 45;

  doc.font("MainRegular").fontSize(normal);
  if (hasMoney) {
    doc.text("Số tiền viết bằng chữ:", leftX, doc.y).fontSize(normal);
  } else {
    doc.moveDown(0.5);
  }

  doc
    .font("MainBoldItalic")
    .fontSize(normal)
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
  doc.font(bold ? "MainBold" : "MainRegular").fontSize(bold ? header_2 : normal);

  const CELL_PADDING_X = 4; // Khoảng cách đệm trái phải
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
      const isNumeric = (val: any) => {
        if (typeof val === "number") return true;
        if (typeof val !== "string") return false;

        // Xử lý trường hợp chuỗi số có dấu phân cách (1.000 hoặc 1,000)
        const cleanStr = val.replace(/[.,\s]/g, "");
        return cleanStr !== "" && !isNaN(Number(cleanStr));
      };

      align = isNumeric(text) ? "right" : "left";

      if (i === 0) align = "center"; // Cột STT luôn căn giữa
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

  doc.font("MainRegular").fontSize(normal);

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

function drawItemTable(doc: PDFKit.PDFDocument, outbound: any, hasMoney: boolean) {
  const items = Array.isArray(outbound.detail)
    ? outbound.detail
    : outbound.detail
      ? [outbound.detail]
      : [];

  const hasPoData = items.some(
    (item: any) => item.Order?.orderIdCustomer && item.Order.orderIdCustomer.trim() !== "",
  );

  // Định nghĩa cấu trúc cột gốc
  let columnConfigs = [
    { id: "stt", label: "STT", ratio: 6 },
    { id: "po", label: "Số PO", ratio: 13 },
    { id: "name", label: "Tên Sản Phẩm", ratio: 24 },
    { id: "qc", label: "Quy Cách TT", ratio: 13 },
    { id: "dvt", label: "ĐVT", ratio: 10 },
    { id: "qty", label: "Số Lượng", ratio: 9 },
    { id: "price", label: "Đơn Giá", ratio: 9 },
    { id: "total", label: "Thành Tiền", ratio: 16 },
  ];

  if (!hasPoData) {
    const poRatio = columnConfigs.find((c) => c.id === "po")?.ratio || 0;

    // Lọc bỏ cột PO
    columnConfigs = columnConfigs.filter((col) => col.id !== "po");

    // Tính tổng tỷ lệ của các cột "linh hoạt" (tất cả trừ STT)
    const fluidCols = columnConfigs.filter((col) => col.id !== "stt");
    const totalFluidRatio = fluidCols.reduce((sum, col) => sum + col.ratio, 0);

    columnConfigs = columnConfigs.map((col) => {
      if (col.id === "stt") return col;

      return {
        ...col,
        ratio: col.ratio + (col.ratio / totalFluidRatio) * poRatio,
      };
    });
  }

  const startY = doc.y;
  const marginX = 20;
  const startX = marginX;
  const availableWidth = doc.page.width - marginX * 2; // Tổng độ rộng còn lại để vẽ bảng

  const tableName = columnConfigs.map((c) => c.label);
  const colW = columnConfigs.map((c) => (c.ratio * availableWidth) / 100);

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

    const lengthCustomer = formatDimension(order.lengthPaperCustomer ?? 0);
    const sizeCustomer = formatDimension(order.paperSizeCustomer ?? 0);
    const lengthManufacture = formatDimension(order.lengthPaperManufacture ?? 0);
    const sizeManufacture = formatDimension(order.paperSizeManufacture ?? 0);
    const qcBox = order.QC_box != "" && order.QC_box != null ? `(${order.QC_box})` : "";

    // Chuẩn bị dữ liệu cho tất cả các cột có thể có
    const fullRowData: any = {
      stt: String(index + 1),
      po: order.orderIdCustomer || "",
      name: `${order.Product.productName ?? ""}:${lengthManufacture}x${sizeManufacture} ${qcBox}`,
      qc: `${lengthCustomer}x${sizeCustomer}`,
      dvt: order.dvt || "",
      qty: fmt(item.outboundQty),
      price: hasMoney ? fmt(order.pricePaper) : "",
      total: hasMoney ? fmt(item.totalPriceOutbound) : "",
    };

    const activeRow = columnConfigs.map((col) => fullRowData[col.id]);

    const rowH = drawTableRow({
      doc,
      y: currentY,
      row: activeRow,
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
    value: hasMoney ? fmt(outbound.totalPriceOrder ?? 0) : "",
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

  doc.fontSize(normal);

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
  doc.text(hasMoney ? fmt(outbound.totalPriceVAT ?? 0) : "", amountColX + paddingX, currentY + 6, {
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
    value: hasMoney ? fmt(outbound.totalPricePayment ?? 0) : "",
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
  const SIGN_BLOCK_HEIGHT = 100; // Ước tính tổng chiều cao của cả cụm chữ ký
  const bottomMargin = 20;
  const pageHeight = doc.page.height;

  if (doc.y + SIGN_BLOCK_HEIGHT > pageHeight - bottomMargin) {
    doc.addPage({ size: "A5", layout: "landscape", margin: 20 });
  }

  const startY = doc.y + 10;
  const pageWidth = doc.page.width;
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / 3;
  const colX = [margin, margin + colWidth, margin + colWidth * 2];

  // ===== NGÀY THÁNG (CỘT GIÁM ĐỐC) =====
  doc
    .font("MainItalic")
    .text("Ngày ..... tháng ..... năm ......", colX[2], startY, {
      width: colWidth,
      align: "center",
    })
    .fontSize(normal);

  const titleY = startY + 24;
  const signNoteY = titleY + 18;

  const format = {
    width: colWidth,
    align: "center" as const,
  };

  // ===== TIÊU ĐỀ =====
  doc.font("MainBold").fontSize(header_2);

  doc.text("Người mua hàng", colX[0], titleY, format);
  doc.text("Kế toán trưởng", colX[1], titleY, format);
  doc.text("Giám đốc", colX[2], titleY, format);

  // ===== GHI CHÚ KÝ =====
  doc.font("MainItalic").fontSize(normal);

  doc.text("(Ký, họ tên)", colX[0], signNoteY, format);
  doc.text("(Ký, họ tên)", colX[1], signNoteY, format);
  doc.text("(Ký, họ tên, đóng dấu)", colX[2], signNoteY, format);

  // đẩy con trỏ xuống để tránh đè nếu còn nội dung
  // doc.y = signNoteY + 80;
}

//======================HELPER===========================
function formatDate(date: Date | string) {
  const d = new Date(date);
  return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export function formatDimension(value?: number): string {
  if (value == null) return "0000";

  const num = Math.round(value * 10); // 62.5 -> 625
  return String(num).padStart(4, "0");
}
