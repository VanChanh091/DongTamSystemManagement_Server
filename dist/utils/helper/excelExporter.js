"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sytleFill = exports.sytleBorder = exports.styleHeaderStream = exports.exportDeliveryExcelResponse = exports.exportExcelDbPlanning = exports.exportExcelStreamResponse = exports.exportExcelResponse = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const appError_1 = require("../appError");
//using for export planning paper
const exportExcelResponse = async (res, { data, sheetName, fileName, columns, rows }) => {
    try {
        // Tạo workbook
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        // Header
        worksheet.columns = columns;
        const colCount = worksheet.columnCount;
        // Data rows
        data.forEach((item, index) => {
            const rowData = rows(item, index);
            const excelRow = worksheet.addRow(rowData);
            for (let i = 1; i <= colCount; i++) {
                const cell = excelRow.getCell(i);
                (0, exports.sytleBorder)(cell);
                (0, exports.sytleFill)(cell, "FFF2F2F2");
            }
        });
        data = null; // giải phóng bộ nhớ cho data sau khi đã add vào excel
        // Header style
        headerStyleAndAutofitColumns(worksheet);
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
const exportExcelStreamResponse = async (res, { baseQuery, model, sheetName, fileName, columns, rows, userName, includeDate = true }) => {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const fullName = includeDate ? `${fileName}_${dateStr}` : fileName;
        // Thiết lập Header cho Response để trình duyệt hiểu là đang tải file Excel
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fullName}.xlsx`);
        // KHỞI TẠO WORKBOOK TRONG CHẾ ĐỘ STREAM
        const workbook = new exceljs_1.default.stream.xlsx.WorkbookWriter({
            stream: res, // Đẩy trực tiếp luồng dữ liệu vào biến res của Express
            useStyles: true, // BẮT BUỘC bật cái này thì sytleBorder và styleFill mới có tác dụng
        });
        const worksheet = workbook.addWorksheet(sheetName);
        worksheet.columns = columns;
        //header style
        (0, exports.styleHeaderStream)(worksheet);
        const totalColumns = columns.length;
        const cellBorder = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        const cellFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        let page = 1;
        const limit = 500; // Mỗi lượt chỉ bốc tối đa 500 dòng lên RAM
        let hasMore = true;
        let globalIndex = 0;
        // VÒNG LẶP STREAM DỮ LIỆU
        while (hasMore) {
            const chunkData = await model.findAll({
                ...baseQuery,
                limit: limit,
                offset: (page - 1) * limit,
            });
            // console.log(`chunkData: ${JSON.stringify(chunkData[0])}`);
            // Nếu không còn dữ liệu nữa thì dừng vòng lặp
            if (!chunkData || chunkData.length === 0) {
                hasMore = false;
                break;
            }
            chunkData.forEach((item) => {
                const rowData = rows(item, globalIndex);
                const excelRow = worksheet.addRow(rowData);
                // Đổ style cho từng ô trong dòng
                for (let i = 1; i <= totalColumns; i++) {
                    const cell = excelRow.getCell(i);
                    cell.border = cellBorder;
                    cell.fill = cellFill;
                }
                // QUAN TRỌNG NHẤT: Đẩy dòng này xuống mạng lập tức và giải phóng RAM
                excelRow.commit();
                globalIndex++;
            });
            // console.log(`📡 Đã stream thành công cụm số ${page} (${chunkData.length} dòng)`);
            page++;
        }
        // 4. ĐÓNG LUỒNG (COMMIT HOÀN TẤT FILE)
        worksheet.commit();
        await workbook.commit();
        console.log(`✅ Toàn bộ file Excel đã được stream thành công! Tổng số dòng: ${globalIndex}, model: ${model.name}, user: ${userName}`);
    }
    catch (error) {
        console.error("Stream Excel error:", error);
        if (!res.headersSent) {
            res.status(500).send("Lỗi trong quá trình xuất file");
        }
    }
};
exports.exportExcelStreamResponse = exportExcelStreamResponse;
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
                        (0, exports.sytleFill)(excelRow.getCell(c), "FFE2EFDA");
                    }
                    excelRow.height = 25;
                }
                // ===== STYLE CON =====
                if (isStage) {
                    for (let c = 1; c <= worksheet.columnCount; c++) {
                        (0, exports.sytleFill)(excelRow.getCell(c), "FFF2F2F2");
                    }
                    // indent ô đầu tiên
                    const firstCell = excelRow.getCell(1);
                    if (firstCell.value) {
                        firstCell.value = `   → ${firstCell.value}`;
                    }
                }
                for (let i = 1; i <= worksheet.columnCount; i++) {
                    (0, exports.sytleBorder)(excelRow.getCell(i));
                }
            });
        });
        // ===== HEADER STYLE =====
        headerStyleAndAutofitColumns(worksheet);
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
const exportDeliveryExcelResponse = async (res, { data, sheetName, fileName, columns, rows }) => {
    try {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        // ĐƯA CỘT 'SEQUENCE' (TÀI) VỀ ĐẦU MẢNG COLUMNS
        const moveCol = (key, toIndex) => {
            const idx = columns.findIndex((c) => c.key === key);
            if (idx > -1) {
                const [col] = columns.splice(idx, 1);
                columns.splice(toIndex, 0, col);
            }
        };
        moveCol("sequence", 0); // Cột 1
        moveCol("vehicleName", 1); // Cột 2
        const rawDate = data[0]?.deliveryDate;
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
            (0, exports.sytleFill)(cell, "FF0070C0");
            cell.alignment = { vertical: "middle", horizontal: "center" };
            (0, exports.sytleBorder)(cell);
        });
        //mapping key cho các cột
        worksheet.columns = columns.map((col) => ({ key: col.key }));
        const allMappedRows = [];
        data.forEach((delivery) => {
            const items = delivery.DeliveryItems || [];
            items.forEach((_, index) => {
                allMappedRows.push(rows(delivery, index));
            });
        });
        // sort theo sequence
        allMappedRows.sort((a, b) => {
            const valA = a.sequence;
            const valB = b.sequence;
            // Kiểm tra xem có phải là số hay không (Tài 1, 2, 3...)
            const isNumA = valA !== null && valA !== "" && !isNaN(Number(valA));
            const isNumB = valB !== null && valB !== "" && !isNaN(Number(valB));
            // TRƯỜNG HỢP 1: Một bên là số, một bên là chữ (Xe ngoài)
            if (isNumA && !isNumB)
                return -1; // A là số -> lên trước
            if (!isNumA && isNumB)
                return 1; // B là số -> A xuống sau
            // TRƯỜNG HỢP 2: Cả hai đều là số -> So sánh số học
            if (isNumA && isNumB) {
                const numA = Number(valA);
                const numB = Number(valB);
                if (numA !== numB)
                    return numA - numB;
            }
            // TRƯỜNG HỢP 3: Cùng số Tài hoặc cùng là "Xe ngoài" -> So sánh Tên Xe
            return (a.vehicleName || "").localeCompare(b.vehicleName || "");
        });
        // ĐỔ DỮ LIỆU VÀO BẢNG
        allMappedRows.forEach((rowData) => {
            const excelRow = worksheet.addRow(rowData);
            excelRow.eachCell((cell) => {
                (0, exports.sytleBorder)(cell);
                (0, exports.sytleFill)(cell, "FFFFFFFF");
            });
        });
        //MERGE DỌC CHO CỘT ĐẦU TIÊN (CỘT TÀI)
        const startDataRow = 3;
        const rowCount = worksheet.rowCount;
        let seqStart = startDataRow;
        let vehStart = startDataRow;
        for (let i = startDataRow; i <= rowCount; i++) {
            const currRow = worksheet.getRow(i);
            const nextRow = i < rowCount ? worksheet.getRow(i + 1) : null;
            const currSeq = currRow.getCell(1).value;
            const nextSeq = nextRow?.getCell(1).value;
            const currVeh = currRow.getCell(2).value;
            const nextVeh = nextRow?.getCell(2).value;
            // Merge Cột Tài (Cột 1)
            if (currSeq !== nextSeq || i === rowCount) {
                const cell = worksheet.getRow(seqStart).getCell(1);
                if (i > seqStart) {
                    worksheet.mergeCells(seqStart, 1, i, 1);
                }
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { bold: true };
                seqStart = i + 1;
            }
            // Merge Cột Tên Xe (Cột 2)
            // Điều kiện gộp: Tên xe giống nhau VÀ Tài giống nhau
            if (currVeh !== nextVeh || currSeq !== nextSeq || i === rowCount) {
                const cell = worksheet.getRow(vehStart).getCell(2);
                if (i > vehStart) {
                    worksheet.mergeCells(vehStart, 2, i, 2);
                }
                cell.alignment = { vertical: "middle", horizontal: "center" };
                vehStart = i + 1;
            }
        }
        headerStyleAndAutofitColumns(worksheet);
        const finalTitle = worksheet.getRow(1).getCell(1);
        finalTitle.value = titleText;
        finalTitle.fill = { type: "pattern", pattern: "none" };
        finalTitle.font = { bold: true, size: 14, color: { argb: "FF000000" } };
        // XUẤT FILE
        const dateStr = new Date().toISOString().split("T")[0];
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}_${dateStr}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("Export Delivery Excel error:", error);
        res.status(500).send("Lỗi xuất Excel");
    }
};
exports.exportDeliveryExcelResponse = exportDeliveryExcelResponse;
//helper functions
const styleHeaderStream = (worksheet) => {
    const headerRow = worksheet.getRow(1);
    // Giữ nguyên 100% logic style cũ của bạn
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        (0, exports.sytleFill)(cell, "FF0070C0"); // Dùng lại màu xanh dương của bạn
        cell.alignment = { vertical: "middle", horizontal: "center" };
        (0, exports.sytleBorder)(cell);
    });
    // Khóa dòng 1 lại và đẩy đi trước trong chế độ Stream
    headerRow.commit();
};
exports.styleHeaderStream = styleHeaderStream;
const headerStyleAndAutofitColumns = (worksheet) => {
    // style main header
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        (0, exports.sytleFill)(cell, "FF0070C0");
        cell.alignment = { vertical: "middle", horizontal: "center" };
        (0, exports.sytleBorder)(cell);
    });
    //auto fit
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
};
const CONST_BORDER = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
};
const sytleBorder = (cell) => {
    // Thay vì mỗi lần gọi lại tạo 1 object {}, ta gán thẳng tham chiếu tới CONST_BORDER
    cell.border = CONST_BORDER;
};
exports.sytleBorder = sytleBorder;
// Dùng Map để cache lại các màu đã từng tạo
const fillCache = new Map();
const sytleFill = (cell, color) => {
    let fill = fillCache.get(color);
    if (!fill) {
        fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
        };
        fillCache.set(color, fill); // Lưu lại để lần sau tái sử dụng
    }
    cell.fill = fill;
};
exports.sytleFill = sytleFill;
//# sourceMappingURL=excelExporter.js.map