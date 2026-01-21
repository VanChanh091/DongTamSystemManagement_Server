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

    // header
    worksheet.columns = columns as ExcelJS.Column[];

    const allMappedRows: any[] = [];
    data.forEach((delivery: any) => {
      const items = delivery.DeliveryItems || [];
      items.forEach((_: any, index: number) => {
        allMappedRows.push(rows(delivery, index));
      });
    });

    // 2. Group dữ liệu theo sequence (Tài)
    const groupedData = allMappedRows.reduce((acc: any, row: any) => {
      const seq = row.sequence || "Chưa xác định";
      if (!acc[seq]) acc[seq] = [];
      acc[seq].push(row);
      return acc;
    }, {});

    // 3. Duyệt qua từng group để in ra Excel (Sắp xếp theo Tài 1, 2, 3...)
    Object.keys(groupedData)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((seq) => {
        const groupRows = groupedData[seq];

        // Thêm dòng Header cho Tài
        const groupRow = worksheet.addRow({
          vehicleName: `TÀI: ${seq}`,
        });

        // Style Group Header
        groupRow.eachCell((cell) => {
          sytleFill(cell, "FFE9ECEF");
          cell.font = { bold: true };
        });

        // Merge cell Header
        worksheet.mergeCells(groupRow.number, 1, groupRow.number, columns.length);

        // Thêm các dòng dữ liệu thuộc Tài này
        groupRows.forEach((rowData: any) => {
          const excelRow = worksheet.addRow(rowData);

          // Style cell
          excelRow.eachCell((cell) => {
            sytleBorder(cell);
            sytleFill(cell, "FFFFFFFF");
          });
        });
      });

    headerStyleAndAutofitColumns(worksheet);

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
