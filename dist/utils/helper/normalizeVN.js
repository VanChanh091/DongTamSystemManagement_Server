"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeVN = void 0;
exports.formatHHmm = formatHHmm;
const normalizeVN = (str = "") => {
    return str
        .normalize("NFD") // tách ký tự & dấu
        .replace(/[\u0300-\u036f]/g, "") // xoá dấu thanh (á à ả ã...)
        .replace(/đ/g, "d") // chuẩn hoá đ
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
};
exports.normalizeVN = normalizeVN;
function formatHHmm(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}
//# sourceMappingURL=normalizeVN.js.map