import ExcelJS from "exceljs";

export const exportExcelResponse = async (res, { data, sheetName, fileName, columns, rows }) => {
  try {
    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Header
    worksheet.columns = columns;

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
    worksheet.columns.forEach((col) => {
      let maxLength = 15;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
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
    throw new Error("Lỗi xuất Excel");
  }
};
