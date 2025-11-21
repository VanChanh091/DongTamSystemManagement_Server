import ExcelJS from "exceljs";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";

export const dbPlanningColumns: Partial<ExcelJS.Column>[] = [
  // paper
  { header: "STT", key: "index" },
  { header: "Mã Đơn Hàng", key: "orderId" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Tên Công Ty", key: "companyName" },
  { header: "Loại SP", key: "typeProduct" },
  { header: "Tên SP", key: "productName" },
  { header: "Nhận Đơn", key: "dayReceive" },
  { header: "Dự Kiến", key: "dateShipping" },
  { header: "Sản Xuất", key: "dayStartProduction" },
  { header: "Hoàn Thành", key: "dayCompletedProd" },
  { header: "Kết Cấu Đặt Hàng", key: "structure" },
  { header: "Sóng", key: "flute" },
  { header: "Khổ Cấp Giấy", key: "khoCapGiay" },
  { header: "Dao Xả", key: "daoXa" },
  { header: "Dài", key: "length" },
  { header: "Khổ", key: "size" },
  { header: "Số Con", key: "child" },
  { header: "Đơn Hàng", key: "quantityOrd" },
  { header: "Đã Sản Xuất", key: "qtyProducedPaper" },
  { header: "Kế Hoạch Chạy", key: "runningPlanPaper" },
  { header: "HD Đặc Biệt", key: "instructSpecial" },
  { header: "Thời Gian Chạy", key: "timeRunningPaper" },
  { header: "DVT", key: "dvt" },
  { header: "Diện Tích", key: "acreage" },
  { header: "Đơn Giá", key: "price" },
  { header: "Giá Tấm", key: "pricePaper" },
  { header: "Chiết Khấu", key: "discounts" },
  { header: "Lợi Nhuận", key: "profitOrd" },
  { header: "VAT", key: "vat" },
  { header: "Tổng Tiền", key: "totalPrice" },
  { header: "Tổng Tiền Sau VAT", key: "totalPriceAfterVAT" },
  { header: "Đáy", key: "bottom" },
  { header: "Sóng E", key: "fluteE" },
  { header: "Sóng E2", key: "fluteE2" },
  { header: "Sóng B", key: "fluteB" },
  { header: "Sóng C", key: "fluteC" },
  { header: "Dao", key: "knife" },
  { header: "Tổng PL", key: "totalLoss" },
  { header: "PL Thực Tế", key: "qtyWastes" },
  { header: "Ca Sản Xuất", key: "shiftProduct" },
  { header: "Trưởng Máy", key: "shiftManagerPaper" },
  { header: "Loại Máy", key: "machinePaper" },
  { header: "Nhân Viên", key: "staffOrder" },

  // stage (box)
  { header: "Loại Máy", key: "machineStage" },
  { header: "Ngày SX", key: "dayStartStage" },
  { header: "Ngày Hoàn Thành", key: "dayCompletedStage" },
  { header: "Thời Gian Chạy", key: "timeRunningStage" },
  { header: "Kế Hoạch Chạy", key: "runningPlanStage" },
  { header: "SL Đã SX", key: "qtyProducedStage" },
  { header: "PL Thực Tế", key: "wasteBox" },
  { header: "PL Hao Hụt", key: "rpWasteLoss" },
  { header: "Trưởng Máy", key: "shiftManagerStage" },
];

export const mappingDbPlanningRow = (item: any, index: number) => {
  const order = item.Order;

  const parentRow = {
    // PAPER FIELDS
    index: index + 1,
    orderId: item.orderId,

    customerName: order.Customer.customerName,
    companyName: order.Customer.companyName,

    typeProduct: order.Product.typeProduct,
    productName: order.Product.productName,

    dayReceive: order.dayReceiveOrder,
    dateShipping: order.dateRequestShipping,
    dayStartProduction: item.dayStart,
    dayCompletedProd: formatDateTime(item.dayCompleted),

    structure: formatterStructureOrder(item),
    flute: order.flute,
    khoCapGiay: item.ghepKho,
    daoXa: order.daoXa,
    length: item.lengthPaperPlanning,
    size: item.sizePaperPLaning,
    child: item.numberChild,

    quantityOrd: order.quantityManufacture,
    qtyProducedPaper: item.qtyProduced,
    runningPlanPaper: item.runningPlan,

    instructSpecial: order.instructSpecial,
    timeRunningPaper: item.timeRunning,
    dvt: order.dvt,

    acreage: order.acreage,
    price: order.price,
    pricePaper: order.pricePaper,
    discounts: order.discount,
    profitOrd: order.profit,
    vat: order.vat,
    totalPrice: order.totalPrice,
    totalPriceAfterVAT: order.totalPriceVAT,

    bottom: item.bottom,
    fluteE: item.fluteE,
    fluteE2: item.fluteE2,
    fluteB: item.fluteB,
    fluteC: item.fluteC,
    knife: item.knife,
    totalLoss: item.totalLoss,
    qtyWastes: item.qtyWasteNorm,

    shiftProduct: item.shiftProduction,
    shiftManagerPaper: item.shiftManagement,
    machinePaper: item.chooseMachine,
    staffOrder: order.User.fullName,

    // STAGE FIELDS
    machineStage: null,
    dayStartStage: null,
    dayCompletedStage: null,
    timeRunningStage: null,
    runningPlanStage: null,
    qtyProducedStage: null,
    wasteBox: null,
    rpWasteLoss: null,
    shiftManagerStage: null,
  };

  // Nếu không có stage → chỉ return parent
  if (!item.stages || item.stages.length === 0) {
    return [parentRow];
  }

  const stageRows = item.stages.map((stage: any, sIndex: number) => ({
    index: `${index + 1}.${sIndex + 1}`, // hiển thị kiểu 3.1, 3.2

    // PAPER FIELDS để trống
    orderId: "→",
    customerName: "",
    companyName: "",
    typeProduct: "",
    productName: "",
    dayReceive: "",
    dateShipping: "",
    dayStartProduction: "",
    dayCompletedProd: "",
    structure: "",
    flute: "",
    khoCapGiay: "",
    daoXa: "",
    length: "",
    size: "",
    child: "",
    quantityOrd: "",
    qtyProducedPaper: "",
    runningPlanPaper: "",
    instructSpecial: "",
    timeRunningPaper: "",
    dvt: "",
    acreage: "",
    price: "",
    pricePaper: "",
    discounts: "",
    profitOrd: "",
    vat: "",
    totalPrice: "",
    totalPriceAfterVAT: "",
    bottom: "",
    fluteE: "",
    fluteE2: "",
    fluteB: "",
    fluteC: "",
    knife: "",
    totalLoss: "",
    qtyWastes: "",
    shiftProduct: "",
    shiftManagerPaper: "",
    machinePaper: "",
    staffOrder: "",

    // STAGE FIELDS (FULL)
    machineStage: stage.machine,
    dayStartStage: stage.dayStart,
    dayCompletedStage: formatDateTime(stage.dayCompleted),
    timeRunningStage: stage.timeRunning,
    runningPlanStage: stage.runningPlan,
    qtyProducedStage: stage.qtyProduced,
    wasteBox: stage.wasteBox,
    rpWasteLoss: stage.rpWasteLoss,
    shiftManagerStage: stage.shiftManagement,
  }));

  // Ghép parent + child
  return [parentRow, ...stageRows];
};

const formatDateTime = (value: any) => {
  if (!value) return "";

  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());

  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
};
