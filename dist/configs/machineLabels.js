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
//# sourceMappingURL=machineLabels.js.map