"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeVN = void 0;
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
//# sourceMappingURL=normalizeVN.js.map