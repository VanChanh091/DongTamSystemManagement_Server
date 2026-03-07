"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateReportFields = void 0;
const aggregateReportFields = (reports) => {
    const shiftProductions = new Set();
    const shiftManagements = new Set();
    reports.forEach((r) => {
        if (r.shiftProduction)
            shiftProductions.add(r.shiftProduction);
        if (r.shiftManagement)
            shiftManagements.add(r.shiftManagement);
    });
    return {
        // Chuyển Set thành chuỗi, ngăn cách bởi dấu phẩy
        combinedShiftProduction: Array.from(shiftProductions).join(", "),
        combinedShiftManagement: Array.from(shiftManagements).join(", "),
    };
};
exports.aggregateReportFields = aggregateReportFields;
//# sourceMappingURL=manufactureHelper.js.map