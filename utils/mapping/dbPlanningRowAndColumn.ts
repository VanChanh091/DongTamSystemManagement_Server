import ExcelJS from "exceljs";
import { formatterStructureOrder } from "../helper/modelHelper/orderHelpers";

export const dbPlanningColumns: Partial<ExcelJS.Column>[] = [
  //================================PAPER====================================
  // Order
  { header: "STT", key: "index" },
  { header: "Mã Đơn Hàng", key: "orderId" },

  // Customer
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Tên Công Ty", key: "companyName" },

  // Product
  { header: "Loại SP", key: "typeProduct" },
  { header: "Tên SP", key: "productName" },

  //day
  { header: "Nhận Đơn", key: "dayReceive" },
  { header: "Dự Kiến", key: "dateShipping" },
  { header: "Sản Xuất", key: "dayStartProduction" },
  { header: "Hoàn Thành", key: "dayCompletedProd" },
  { header: "Hoàn Thành (Tràn)", key: "dayCompletedPaperOvfl" },

  //other fields
  { header: "Kết Cấu Đặt Hàng", key: "structure" },
  { header: "Sóng", key: "flute" },
  { header: "Khổ Cấp Giấy", key: "khoCapGiay" },
  { header: "Dao Xả", key: "daoXa" },
  { header: "Dài (cm)", key: "length", style: { numFmt: "#,##0" } },
  { header: "Khổ (cm)", key: "size", style: { numFmt: "#,##0" } },
  { header: "Số Con", key: "child" },

  // Quantity
  { header: "Đơn Hàng", key: "quantityOrd" },
  { header: "Đã Sản Xuất", key: "qtyProducedPaper" },
  { header: "Kế Hoạch Chạy", key: "runningPlanPaper" },

  //time running
  { header: "Thời Gian Chạy", key: "timeRunningPaper" },
  { header: "Thời Gian Tràn", key: "timeRunningPaperOvfl" },

  { header: "HD Đặc Biệt", key: "instructSpecial" },

  // Order money
  { header: "DVT", key: "dvt" },
  { header: "Diện Tích (M2)", key: "acreage", style: { numFmt: "#,##0" } },
  { header: "Đơn Giá (VND)", key: "price", style: { numFmt: "#,##0" } },
  { header: "Giá Tấm (VND)", key: "pricePaper", style: { numFmt: "#,##0" } },
  { header: "Chiết Khấu", key: "discounts", style: { numFmt: "#,##0" } },
  { header: "Lợi Nhuận", key: "profitOrd", style: { numFmt: "#,##0" } },
  { header: "VAT", key: "vat" },
  { header: "Tổng Tiền (VND)", key: "totalPrice", style: { numFmt: "#,##0" } },
  { header: "Tổng Tiền Sau VAT (VND)", key: "totalPriceAfterVAT", style: { numFmt: "#,##0" } },

  //Waste
  { header: "Đáy", key: "bottom" },
  { header: "Sóng E", key: "fluteE" },
  { header: "Sóng E2", key: "fluteE2" },
  { header: "Sóng B", key: "fluteB" },
  { header: "Sóng C", key: "fluteC" },
  { header: "Dao", key: "knife" },
  { header: "Tổng PL", key: "totalLoss" },

  // Sản xuất
  { header: "PL Thực Tế", key: "qtyWastes" },
  { header: "Ca Sản Xuất", key: "shiftProduct" },
  { header: "Trưởng Máy", key: "shiftManagerPaper" },
  { header: "Loại Máy", key: "machinePaper" },

  // Staff
  { header: "Nhân Viên", key: "staffOrder" },

  //================================STAGE====================================
  { header: "Loại Máy", key: "machineStage" },
  { header: "Ngày SX", key: "dayStartStage" },
  { header: "Hoàn Thành", key: "dayCompletedStage" },
  { header: "Hoàn Thành (Tràn)", key: "dayCompletedOvfl" },
  { header: "Thời Gian Chạy", key: "timeRunningStage" },
  { header: "Thời Gian Tràn", key: "timeRunningOvfl" },
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

    // Customer
    customerName: order.Customer.customerName,
    companyName: order.Customer.companyName,

    // Product
    typeProduct: order.Product.typeProduct,
    productName: order.Product.productName,

    //day
    dayReceive: order.dayReceiveOrder,
    dateShipping: order.dateRequestShipping,
    dayStartProduction: item.dayStart,
    dayCompletedProd: formatDateTime(item.dayCompleted),
    dayCompletedPaperOvfl: formatDateTime(item?.timeOverFlow?.overflowDayCompleted ?? ""),

    //other fields
    structure: formatterStructureOrder(item),
    flute: order.flute,
    khoCapGiay: item.ghepKho,
    daoXa: order.daoXa,
    length: Number(item.lengthPaperPlanning),
    size: Number(item.sizePaperPLaning),
    child: item.numberChild,

    // Quantity
    quantityOrd: order.quantityManufacture,
    qtyProducedPaper: item.qtyProduced,
    runningPlanPaper: item.runningPlan,

    //time running
    timeRunningPaper: formatTime(item.timeRunning),
    timeRunningPaperOvfl: formatTime(item?.timeOverFlow?.overflowTimeRunning ?? ""),

    instructSpecial: order.instructSpecial,

    // Order money
    dvt: order.dvt,
    acreage: Number(order.acreage),
    price: Number(order.price),
    pricePaper: Number(order.pricePaper),
    discounts: Number(order.discount),
    profitOrd: Number(order.profit),
    vat: order.vat,
    totalPrice: Number(order.totalPrice),
    totalPriceAfterVAT: Number(order.totalPriceVAT),

    //Waste
    bottom: item.bottom,
    fluteE: item.fluteE,
    fluteE2: item.fluteE2,
    fluteB: item.fluteB,
    fluteC: item.fluteC,
    knife: item.knife,
    totalLoss: item.totalLoss,

    //manufacture
    qtyWastes: item.qtyWasteNorm,
    shiftProduct: item.shiftProduction,
    shiftManagerPaper: item.shiftManagement,
    machinePaper: item.chooseMachine,

    // Staff
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
    dayCompletedOvfl: formatDateTime(stage?.timeOverFlow?.overflowDayCompleted ?? ""),
    timeRunningStage: formatTime(stage.timeRunning),
    timeRunningOvfl: formatTime(stage?.timeOverFlow?.overflowTimeRunning ?? ""),
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

  // Đọc chuỗi gốc, không convert timezone
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return "";

  const [year, month, day] = datePart.split("-");
  const [hms] = timePart.split(".");

  return `${day}/${month}/${year} ${hms.slice(0, 8)}`;
};

const formatTime = (value: any) => {
  if (!value) return "";

  const parts = value.split(":");
  if (parts.length < 2) return "";

  const [hh, mm] = parts;

  return `${hh}:${mm}`;
};
