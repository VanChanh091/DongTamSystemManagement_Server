"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.machineMap = exports.validPermissions = exports.MACHINE_FIELD_MAP = exports.machineLabels = void 0;
const machineLabels = {
    "Máy 1350": "machine1350",
    "Máy 1900": "machine1900",
    "Máy 2 Lớp": "machine2Layer",
    "Máy Quấn Cuồn": "MachineRollPaper",
};
exports.machineLabels = machineLabels;
const MACHINE_FIELD_MAP = {
    "Máy In": "qtyPrinted",
    "Máy Cấn Lằn": "qtyCanLan",
    "Máy Cán Màng": "qtyCanMang",
    "Máy Xả": "qtyXa",
    "Máy Cắt Khẻ": "qtyCatKhe",
    "Máy Bế": "qtyBe",
    "Máy Dán": "qtyDan",
    "Máy Đóng Ghim": "qtyDongGhim",
};
exports.MACHINE_FIELD_MAP = MACHINE_FIELD_MAP;
const validPermissions = [
    "sale",
    "plan",
    "HR",
    "accountant",
    "design",
    "production",
    "machine1350",
    "machine1900",
    "machine2Layer",
    "MachineRollPaper",
    "step2Production",
    "QC",
    "delivery",
    "read",
];
exports.validPermissions = validPermissions;
const machineMap = {
    hasIn: "Máy In",
    hasCanLan: "Máy Cấn Lằn",
    hasBe: "Máy Bế",
    hasXa: "Máy Xả",
    hasDan: "Máy Dán",
    hasCatKhe: "Máy Cắt Khe",
    hasCanMang: "Máy Cán Màng",
    hasDongGhim: "Máy Đóng Ghim",
};
exports.machineMap = machineMap;
const fluteRatio = {
    // quy tac sap xep song E -> B -> C
    "2E": 0.0018,
    "2B": 0.0028,
    "2C": 0.0032,
    "3E": 0.0019,
    "3B": 0.0026,
    "3C": 0.0034,
    "4EE": 0.0034,
    "4EC": 0.0053,
    "4EB": 0.0045,
    "4BC": 0.006,
    "5EB": 0.0045,
    "5BC": 0.006,
    "7EBC": 0.0085,
    // 5EE
    // 5EC
    // 6EBC
};
//# sourceMappingURL=machineLabels.js.map