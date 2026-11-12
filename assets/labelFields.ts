const machineLabels: Record<string, string> = {
  "Máy 1350": "machine1350",
  "Máy 1800": "machine1800",
  "Máy 1900": "machine1900",
  "Máy 2 Lớp": "machine2Layer",
  "Máy 2 Lớp 2": "machine2Layer2",
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
  "machine1800",
  "machine1900",
  "machine2Layer",
  "machine2Layer2",
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

const MEILI_INDEX = {
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  ORDERS: "orders",
  EMPLOYEES: "employees",
  PLANNING_PAPERS: "planningPapers",
  PLANNING_BOXES: "planningBoxes",
  SCRAP_REPORTS: "scrapReports",
  INBOUND: "inboundHistories",
  OUTBOUNDS: "outbounds",
  INVENTORIES: "inventories",
  INVENTORY_WIP_SHEETS: "invWipSheets",
  REPORT_PAPERS: "reportPapers",
  REPORT_BOXES: "reportBoxes",
  DASHBOARD: "dashboard",
  DELIVERY_REQUEST: "deliveryRequest",
};

const isTwoLayerMachine = (machineName?: string | null): boolean =>
  (machineName ?? "").trim().toLowerCase().includes("2 lớp");

const isRollPaperMachine = (machineName?: string | null): boolean =>
  (machineName ?? "").trim().toLowerCase().includes("quấn cuồn");

export {
  machineLabels,
  MACHINE_FIELD_MAP,
  validPermissions,
  machineMap,
  MEILI_INDEX,
  isTwoLayerMachine,
  isRollPaperMachine,
};
