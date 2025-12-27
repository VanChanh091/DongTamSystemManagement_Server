import { Response } from "express";
import PDFDocument from "pdfkit";
import path from "path";
import { OutboundHistory } from "../../models/warehouse/outboundHistory";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { Product } from "../../models/product/product";
import { AppError } from "../appError";
import { User } from "../../models/user/user";
import { OutboundDetail } from "../../models/warehouse/outboundDetail";

const FONT_REGULAR = path.join(process.cwd(), "assest/fonts/NotoSerif-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "assest/fonts/NotoSerif-Bold.ttf");
const FONT_ITALIC = path.join(process.cwd(), "assest/fonts/NotoSerif-Italic.ttf");
const FONT_BOLD_ITALIC = path.join(process.cwd(), "assest/fonts/NotoSerif-BoldItalic.ttf");

export async function exportWarehouseSaleByOutboundId(res: Response, outboundId: number) {
  const outbound = await OutboundHistory.findOne({
    attributes: { exclude: ["createdAt", "updatedAt", "totalOutboundQty"] },
    include: [
      {
        model: OutboundDetail,
        as: "detail",
        attributes: { exclude: ["createdAt", "updatedAt", "deliveredQty", "outboundId"] },
        include: [
          {
            model: Order,
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
            ],
            include: [
              {
                model: Customer,
                attributes: ["customerName", "companyName", "companyAddress", "mst", "phone"],
              },
              { model: Product, attributes: ["typeProduct", "productName"] },
              { model: User, attributes: ["fullName"] },
            ],
          },
        ],
      },
    ],
  });
  if (!outbound) throw AppError.NotFound("Outbound not found", "OUTBOUND_NOT_FOUND");

  return buildWarehouseSalePDF({
    res,
    outbound,
  });
}
function buildWarehouseSalePDF({ res, outbound }: { res: Response; outbound: any }) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const fileName = `phieu-xuat-kho_${dateStr}.pdf`;

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
      }
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
  drawItemTable(doc, outbound.detail);

  /* ===== TOTAL ===== */
  // const total = data.items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  // doc.moveDown(1);
  // doc.text(`Tổng tiền thanh toán: ${total.toLocaleString("vi-VN")} VND`);
  // doc.font(FONT_ITALIC).text(`Số tiền viết bằng chữ: ${numberToVietnamese(total)} đồng chẵn.`);

  /* ===== SIGN ===== */
  drawSignArea(doc);

  doc.end();
}

function drawItemTable(doc: PDFKit.PDFDocument, outboundDetail: any) {
  const items = Array.isArray(outboundDetail)
    ? outboundDetail
    : outboundDetail
    ? [outboundDetail]
    : [];

  const startY = doc.y;
  const rowHeight = 28;
  const startX = 40;
  const colW = [30, 80, 160, 40, 70, 70, 80];

  const colX = colW.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? startX : acc[i - 1] + colW[i - 1]);
    return acc;
  }, []);

  function drawRow(y: number, row: string[], bold = false) {
    doc.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(10);

    row.forEach((text, i) => {
      doc.text(String(text ?? ""), colX[i], y, {
        width: colW[i],
        align: i >= 4 ? "right" : "left",
      });
    });

    // line ngang
    doc
      .moveTo(40, y + rowHeight - 6)
      .lineTo(590, y + rowHeight - 6)
      .stroke();
  }

  const fmt = (v: number) => Number(v || 0).toLocaleString("vi-VN");

  // Header
  drawRow(
    startY,
    ["STT", "Mã hàng", "Tên hàng", "ĐVT", "Số lượng xuất", "Đơn giá", "Thành tiền"],
    true
  );

  // Rows
  items.forEach((item, index) => {
    const order = item.Order;

    //leng: 62.5, size: 75 -> 0625, 0750
    const lengthCode = formatDimension(order.lengthPaperCustomer ?? 0);
    const sizeCode = formatDimension(order.paperSizeCustomer ?? 0);
    let qcBox = "";

    if (item.QC_box != null) {
      qcBox = `-${item.QC_box ?? ""}`;
    }

    drawRow(startY + rowHeight * (index + 1), [
      String(index + 1),
      order.orderId,
      `${order.Product.productName ?? ""}:${lengthCode}x${sizeCode}${qcBox}`,
      order?.dvt ?? "",
      fmt(item.outboundQty),
      fmt(item.Order?.pricePaper),
      fmt(item.totalPriceOutbound),
    ]);
  });

  // Bottom line
  const bottomY = startY + rowHeight * (items.length + 1);
  doc.moveTo(40, bottomY).lineTo(550, bottomY).stroke();

  doc.y = bottomY + 10;
}

function drawSignArea(doc: PDFKit.PDFDocument) {
  doc.moveDown(3);

  doc.font(FONT_BOLD).fontSize(11);
  doc.text("Người mua hàng", 80);
  doc.text("Kế toán trưởng", 250);
  doc.text("Giám đốc", 420);

  doc.font(FONT_ITALIC).fontSize(9);
  doc.text("(Ký, họ tên)", 80);
  doc.text("(Ký, họ tên)", 250);
  doc.text("(Ký, họ tên, đóng dấu)", 420);
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function numberToVietnamese(num: number): string {
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const levels = ["", "nghìn", "triệu", "tỷ"];

  function readTriple(n: number) {
    let str = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) str += `${units[h]} trăm `;
    if (t > 1) str += `${units[t]} mươi `;
    else if (t === 1) str += "mười ";

    if (u > 0) {
      if (t >= 1 && u === 5) str += "lăm ";
      else str += `${units[u]} `;
    }
    return str.trim();
  }

  let result = "";
  let level = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      result = `${readTriple(chunk)} ${levels[level]} ${result}`;
    }
    num = Math.floor(num / 1000);
    level++;
  }

  return result.trim();
}

function formatDimension(value?: number): string {
  if (value == null) return "0000";

  const num = Math.round(value * 10); // 62.5 -> 625
  return String(num).padStart(4, "0");
}
