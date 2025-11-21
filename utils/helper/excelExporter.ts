import ExcelJS from "exceljs";
import { Response } from "express";
import { AppError } from "../appError";

interface ExportExcelOptions<T> {
  data: T[];
  sheetName: string;
  fileName: string;
  columns: Partial<ExcelJS.Column>[];
  rows: (item: T, index: number) => Record<string, any>;
}

export const exportExcelResponse = async <T>(
  res: Response,
  { data, sheetName, fileName, columns, rows }: ExportExcelOptions<T>
) => {
  try {
    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Header
    worksheet.columns = columns as ExcelJS.Column[];

    // Data rows
    data.forEach((item, index) => worksheet.addRow(rows(item, index)));

    // Header style
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Auto-fit columns
    worksheet.columns.forEach((col: Record<string, any>) => {
      let maxLength = 15;

      col.eachCell?.({ includeEmpty: true }, (cell: Record<string, any>) => {
        const value = cell.value;
        const cellLength = value ? value.toString().length : 0;

        if (cellLength > maxLength) maxLength = cellLength;
      });

      col.width = maxLength + 2;
    });

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const fullName = `${fileName}_${dateStr}`;

    // Xuất file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
  { data, sheetName, fileName, columns, rows }: ExportExcelOptions<T>
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
          excelRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE2EFDA" }, // xanh nhạt
          };
          excelRow.height = 25;
        }

        // ===== STYLE CON =====
        if (isStage) {
          excelRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" }, // xám nhẹ
          };

          // indent ô đầu tiên
          const firstCell = excelRow.getCell(1);
          if (firstCell.value) {
            firstCell.value = `   → ${firstCell.value}`;
          }
        }
      });
    });

    // ===== HEADER STYLE =====
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // ===== AUTO FIT =====
    worksheet.columns.forEach((col: any) => {
      let max = 15;
      col.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const v = cell.value ? cell.value.toString() : "";
        if (v.length > max) max = v.length;
      });
      col.width = max + 2;
    });

    // ===== RETURN FILE =====
    const dateStr = new Date().toISOString().split("T")[0];
    const fullName = `${fileName}_${dateStr}`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fullName}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("ExportExcelV2 error:", error);
    throw AppError.BadRequest("Lỗi xuất Excel", "ERROR_EXPORT_EXCEL");
  }
};
