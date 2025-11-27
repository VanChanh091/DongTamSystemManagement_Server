"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelDbPlanning = exports.exportExcelResponse = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const appError_1 = require("../appError");
const exportExcelResponse = async (res, { data, sheetName, fileName, columns, rows }) => {
    try {
        // Tạo workbook
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        // Header
        worksheet.columns = columns;
        // Data rows
        data.forEach((item, index) => {
            const rowData = rows(item, index);
            const excelRow = worksheet.addRow(rowData);
            for (let i = 1; i <= worksheet.columnCount; i++) {
                const cell = excelRow.getCell(i);
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" },
                };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF2F2F2" }, // màu xám nhẹ
                };
            }
        });
        // Header style
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF0070C0" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });
        // Auto-fit columns
        worksheet.columns.forEach((col) => {
            let maxLength = 15;
            col.eachCell?.({ includeEmpty: true }, (cell) => {
                const value = cell.value;
                const cellLength = value ? value.toString().length : 0;
                if (cellLength > maxLength)
                    maxLength = cellLength;
            });
            col.width = maxLength + 2;
        });
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const fullName = `${fileName}_${dateStr}`;
        // Xuất file
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fullName}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("Export Excel error:", error);
        throw appError_1.AppError.BadRequest("Lỗi xuất Excel", "ERROR_EXPORT_EXCEL");
    }
};
exports.exportExcelResponse = exportExcelResponse;
const exportExcelDbPlanning = async (res, { data, sheetName, fileName, columns, rows }) => {
    try {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        worksheet.columns = columns;
        let currentRowIndex = 1; // để tracking styling
        data.forEach((item, index) => {
            const mapped = rows(item, index);
            const list = Array.isArray(mapped) ? mapped : [mapped];
            list.forEach((r) => {
                const excelRow = worksheet.addRow(r);
                currentRowIndex++;
                const isParent = !r.machineStage;
                const isStage = !!r.machineStage;
                if (isParent)
                    excelRow.outlineLevel = 0;
                if (isStage)
                    excelRow.outlineLevel = 1;
                // ===== STYLE CHA =====
                if (isParent) {
                    for (let c = 1; c <= worksheet.columnCount; c++) {
                        const cell = excelRow.getCell(c);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFE2EFDA" }, // xanh nhạt
                        };
                    }
                    excelRow.height = 25;
                }
                // ===== STYLE CON =====
                if (isStage) {
                    for (let c = 1; c <= worksheet.columnCount; c++) {
                        const cell = excelRow.getCell(c);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFF2F2F2" }, // xám nhẹ
                        };
                    }
                    // indent ô đầu tiên
                    const firstCell = excelRow.getCell(1);
                    if (firstCell.value) {
                        firstCell.value = `   → ${firstCell.value}`;
                    }
                }
                for (let i = 1; i <= worksheet.columnCount; i++) {
                    const cell = excelRow.getCell(i);
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" },
                    };
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
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });
        // ===== AUTO FIT =====
        worksheet.columns.forEach((col) => {
            let max = 15;
            col.eachCell?.({ includeEmpty: true }, (cell) => {
                const v = cell.value ? cell.value.toString() : "";
                if (v.length > max)
                    max = v.length;
            });
            col.width = max + 2;
        });
        // ===== RETURN FILE =====
        const dateStr = new Date().toISOString().split("T")[0];
        const fullName = `${fileName}_${dateStr}`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fullName}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("Export excel error:", error);
        throw appError_1.AppError.BadRequest("Lỗi xuất Excel", "ERROR_EXPORT_EXCEL");
    }
};
exports.exportExcelDbPlanning = exportExcelDbPlanning;
//# sourceMappingURL=excelExporter.js.map