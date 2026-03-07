export const aggregateReportFields = (reports: any[]) => {
  const shiftProductions = new Set<string>();
  const shiftManagements = new Set<string>();

  reports.forEach((r) => {
    if (r.shiftProduction) shiftProductions.add(r.shiftProduction);
    if (r.shiftManagement) shiftManagements.add(r.shiftManagement);
  });

  return {
    // Chuyển Set thành chuỗi, ngăn cách bởi dấu phẩy
    combinedShiftProduction: Array.from(shiftProductions).join(", "),
    combinedShiftManagement: Array.from(shiftManagements).join(", "),
  };
};
