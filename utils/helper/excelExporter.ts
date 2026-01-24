import ExcelJS from "exceljs";
import { Response } from "express";
import { AppError } from "../appError";
import { ExportExcelOptions } from "../../interface/types";

export const exportExcelResponse = async <T>(
  res: Response,
  { data, sheetName, fileName, columns, rows }: ExportExcelOptions<T>,
) => {
  try {
    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Header
    worksheet.columns = columns as ExcelJS.Column[];

    // Data rows
    data.forEach((item, index) => {
      const rowData = rows(item, index);
      const excelRow = worksheet.addRow(rowData);

      for (let i = 1; i <= worksheet.columnCount; i++) {
        sytleBorder(excelRow.getCell(i));
        sytleFill(excelRow.getCell(i), "FFF2F2F2");
      }
    });

    // Header style
    headerStyleAndAutofitColumns(worksheet);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const fullName = `${fileName}_${dateStr}`;

    // Xuất file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fullName}.xlsx`);

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Export Excel error:", error);
    throw AppError.BadRequest("Lỗi xuất Excel", "ERROR_EXPORT_EXCEL");
  }
};

export const exportExcelDbPlanning = async <T>(
  res: Response,
  { data, sheetName, fileName, columns, rows }: ExportExcelOptions<T>,
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns as ExcelJS.Column[];

    let currentRowIndex = 1; // để tracking styling

    data.forEach((item, index) => {
      const mapped = rows(item, index);

      const list = Array.isArray(mapped) ? mapped : [mapped];

      list.forEach((r) => {
        const excelRow = worksheet.addRow(r);
        currentRowIndex++;

        const isParent = !r.machineStage;
        const isStage = !!r.machineStage;

        if (isParent) excelRow.outlineLevel = 0;
        if (isStage) excelRow.outlineLevel = 1;

        // ===== STYLE CHA =====
        if (isParent) {
          for (let c = 1; c <= worksheet.columnCount; c++) {
            sytleFill(excelRow.getCell(c), "FFE2EFDA");
          }
          excelRow.height = 25;
        }

        // ===== STYLE CON =====
        if (isStage) {
          for (let c = 1; c <= worksheet.columnCount; c++) {
            sytleFill(excelRow.getCell(c), "FFF2F2F2");
          }

          // indent ô đầu tiên
          const firstCell = excelRow.getCell(1);
          if (firstCell.value) {
            firstCell.value = `   → ${firstCell.value}`;
          }
        }

        for (let i = 1; i <= worksheet.columnCount; i++) {
          sytleBorder(excelRow.getCell(i));
        }
      });
    });

    // ===== HEADER STYLE =====
    headerStyleAndAutofitColumns(worksheet);

    // ===== RETURN FILE =====
    const dateStr = new Date().toISOString().split("T")[0];
    const fullName = `${fileName}_${dateStr}`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fullName}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export excel error:", error);
    throw AppError.BadRequest("Lỗi xuất Excel", "ERROR_EXPORT_EXCEL");
  }
};

export const exportDeliveryExcelResponse = async <T>(
  res: Response,
  { data, sheetName, fileName, columns, rows }: ExportExcelOptions<T>,
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // ĐƯA CỘT 'SEQUENCE' (TÀI) VỀ ĐẦU MẢNG COLUMNS
    const sequenceColIndex = columns.findIndex((c) => c.key === "sequence");
    if (sequenceColIndex > -1) {
      const [sequenceCol] = columns.splice(sequenceColIndex, 1);
      columns.unshift(sequenceCol); // Đẩy lên vị trí 0
    }

    const rawDate = (data[0] as any)?.deliveryDate;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString("vi-VN") : "";
    const titleText = `LỊCH GIAO HÀNG ${formattedDate}`;

    // TITLE (Dòng 1)
    const titleRow = worksheet.addRow([titleText]);
    const titleCell = titleRow.getCell(1);

    titleCell.font = { bold: true, size: 14, color: { argb: "FF000000" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "none" };
    titleRow.height = 30;

    worksheet.mergeCells(1, 1, 1, columns.length);

    // HEADER TABLE (Dòng 2)
    const headerRow = worksheet.addRow(columns.map((c) => c.header));

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      sytleFill(cell, "FF0070C0");
      cell.alignment = { vertical: "middle", horizontal: "center" };
      sytleBorder(cell);
    });

    //mapping key cho các cột
    worksheet.columns = columns.map((col) => ({ key: col.key }));

    const allMappedRows: any[] = [];
    data.forEach((delivery: any) => {
      const items = delivery.DeliveryItems || [];
      items.forEach((_: any, index: number) => {
        allMappedRows.push(rows(delivery, index));
      });
    });

    // sort theo sequence
    allMappedRows.sort((a, b) => Number(a.sequence) - Number(b.sequence));

    // ĐỔ DỮ LIỆU VÀO BẢNG
    allMappedRows.forEach((rowData) => {
      const excelRow = worksheet.addRow(rowData);
      excelRow.eachCell((cell) => {
        sytleBorder(cell);
        sytleFill(cell, "FFFFFFFF");
      });
    });

    //MERGE DỌC CHO CỘT ĐẦU TIÊN (CỘT TÀI)
    let startRow = 3;
    const rowCount = worksheet.rowCount;

    for (let i = startRow; i <= rowCount; i++) {
      const currValue = worksheet.getRow(i).getCell(1).value;
      const nextValue = i < rowCount ? worksheet.getRow(i + 1).getCell(1).value : null;

      if (currValue !== nextValue || i === rowCount) {
        if (i > startRow) {
          worksheet.mergeCells(startRow, 1, i, 1);
          const mergedCell = worksheet.getRow(startRow).getCell(1);
          mergedCell.alignment = { vertical: "middle", horizontal: "center" };
          mergedCell.font = { bold: true };
          // Đổ màu xám nhẹ cho cột Tài để phân biệt nhóm
          sytleFill(mergedCell, "FFF9F9F9");
        }
        startRow = i + 1;
      }
    }

    headerStyleAndAutofitColumns(worksheet);

    const finalTitle = worksheet.getRow(1).getCell(1);
    finalTitle.value = titleText;
    finalTitle.fill = { type: "pattern", pattern: "none" };
    finalTitle.font = { bold: true, size: 14, color: { argb: "FF000000" } };

    // XUẤT FILE
    const dateStr = new Date().toISOString().split("T")[0];
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}_${dateStr}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export Delivery Excel error:", error);
    res.status(500).send("Lỗi xuất Excel");
  }
};

const headerStyleAndAutofitColumns = (worksheet: ExcelJS.Worksheet) => {
  // style main header
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    sytleFill(cell, "FF0070C0");
    cell.alignment = { vertical: "middle", horizontal: "center" };
    sytleBorder(cell);
  });

  //auto fit
  worksheet.columns.forEach((col: Record<string, any>) => {
    let maxLength = 15;

    col.eachCell?.({ includeEmpty: true }, (cell: Record<string, any>) => {
      const value = cell.value;
      const cellLength = value ? value.toString().length : 0;

      if (cellLength > maxLength) maxLength = cellLength;
    });

    col.width = maxLength + 2;
  });
};

const sytleBorder = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
};

const sytleFill = (cell: ExcelJS.Cell, color: string) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color }, //"FFFFFFFF"
  };
};
