const machineLabels = {
  "Máy 1350": "machine1350",
  "Máy 1900": "machine1900",
  "Máy 2 Lớp": "machine2Layer",
  "Máy Quấn Cuồn": "MachineRollPaper",
};

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

export { machineLabels, MACHINE_FIELD_MAP, validPermissions, machineMap };
