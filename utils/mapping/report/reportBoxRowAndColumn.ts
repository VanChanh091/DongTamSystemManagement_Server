import { dayjsUtc, VN_TZ } from "../../../assets/configs/dayjs/dayjs.config";
import { MACHINE_FIELD_MAP } from "../../../assets/labelFields";
import { ReportPlanningBox } from "../../../models/report/reportPlanningBox";
import { formatterStructureOrder } from "../../helper/modelHelper/orderHelpers";
import ExcelJS from "exceljs";

export const reportBoxColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Mã Đơn Hàng", key: "orderId" },
  { header: "Tên Khách Hàng", key: "customerName" },

  { header: "Ngày YC Giao", key: "dateShipping", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Ngày Sản Xuất", key: "dayStartProduction", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Ngày Báo Cáo", key: "dayReported", style: { numFmt: "dd/mm/yyyy hh:mm" } },

  { header: "Kết Cấu Đặt Hàng", key: "structure" },
  { header: "Sóng", key: "flute" },
  { header: "QC Thùng", key: "QcBox" },
  { header: "Dài", key: "length", style: { numFmt: "#,##0" } },
  { header: "Khổ", key: "size", style: { numFmt: "#,##0" } },
  { header: "Số Con", key: "child" },
  { header: "SL Đơn Hàng", key: "quantityOrd" },
  { header: "SL Giấy Tấm", key: "runningPlans" },
  { header: "Thời Gian Chạy", key: "timeRunnings" },
  { header: "In", key: "qtyPrinted" },
  { header: "Cấn Lằn", key: "qtyCanLan" },
  { header: "Cán Màng", key: "qtyCanMang" },
  { header: "Xả", key: "qtyXa" },
  { header: "Cắt Khe", key: "qtyCatKhe" },
  { header: "Bế", key: "qtyBe" },
  { header: "Dán", key: "qtyDan" },
  { header: "Đóng Ghim", key: "qtyDongGhim" },
  { header: "Thiếu/Đủ SL", key: "lackOfQty" },
  { header: "In Mặt Trước", key: "inMatTruoc" },
  { header: "In Mặt Sau", key: "inMatSau" },
  { header: "Dán 1 Mảnh", key: "dan_1_Manh" },
  { header: "Dán 2 Mảnh", key: "dan_2_Manh" },
  { header: "ĐGhim 1 Mảnh", key: "dongGhim1Manh" },
  { header: "ĐGhim 2 Mảnh", key: "dongGhim2Manh" },
  { header: "Định Mức PL", key: "dmWasteLoss" },
  { header: "PL Báo Cáo", key: "wasteLossRp" },
  { header: "Trưởng Máy", key: "shiftManager" },
  { header: "Loại Máy", key: "machine" },
];

const getMachineQty = (
  machine: string,
  planningBox: {
    boxTimes?: Array<{ machine: string; qtyProduced?: number | null }>;
    allBoxTimes?: Array<{ machine: string; qtyProduced?: number | null }>;
  },
  item: { machine?: string; qtyProduced?: number | null },
) => {
  // Nếu đúng là máy của dòng báo cáo hiện tại thì lấy sản lượng của báo cáo đó
  if (item.machine === machine) {
    return item.qtyProduced ?? 0;
  }

  // Ngược lại lấy sản lượng đã chạy của máy khác (từ boxTimes khi xuất tất cả máy hoặc allBoxTimes khi lọc 1 máy)
  const foundBoxTime =
    planningBox?.boxTimes?.find((bt) => bt.machine === machine) ||
    planningBox?.allBoxTimes?.find((bt) => bt.machine === machine);

  return foundBoxTime?.qtyProduced || 0;
};

export const mapReportBoxRow = (item: ReportPlanningBox, index: number) => {
  const planningBox = item.PlanningBox;
  const order = planningBox?.Order || {};
  const customer = order?.Customer || {};
  const box = order?.box || {};
  const currentBoxTime =
    planningBox?.boxTimes?.find((bt) => bt.machine === item.machine) || planningBox?.boxTimes?.[0];

  type MachineField = (typeof MACHINE_FIELD_MAP)[keyof typeof MACHINE_FIELD_MAP];

  const qtyFields: Record<MachineField, number> = {
    qtyPrinted: 0,
    qtyCanLan: 0,
    qtyCanMang: 0,
    qtyXa: 0,
    qtyCatKhe: 0,
    qtyBe: 0,
    qtyDan: 0,
    qtyDongGhim: 0,
  };

  Object.entries(MACHINE_FIELD_MAP).forEach(([mName, field]) => {
    qtyFields[field] = getMachineQty(mName, planningBox, item) ?? 0;
  });

  return {
    index: index + 1,

    // Thông tin đơn hàng
    orderId: order.orderId,
    customerName: customer.customerName || "",

    dateShipping: order.dateRequestShipping
      ? dayjsUtc.tz(order.dateRequestShipping, VN_TZ).format("DD/MM/YYYY")
      : "",
    dayStartProduction: currentBoxTime?.dayStart
      ? dayjsUtc.tz(currentBoxTime.dayStart, VN_TZ).format("DD/MM/YYYY")
      : "",
    dayReported: item.dayReport ? dayjsUtc.tz(item.dayReport, VN_TZ).format("DD/MM/YYYY HH:mm") : "",

    // Thông số sản xuất
    structure: formatterStructureOrder(planningBox),
    flute: order.flute,
    QcBox: order.QC_box,
    length: Number(planningBox.length),
    size: Number(planningBox.size),
    child: order.numberChild,
    quantityOrd: order.quantityCustomer,
    runningPlans: currentBoxTime?.runningPlan || null,
    timeRunnings: currentBoxTime?.timeRunning || null,

    ...qtyFields,

    lackOfQty: item.lackOfQty,
    inMatTruoc: box.inMatTruoc,
    inMatSau: box.inMatSau,
    dan_1_Manh: box.dan_1_Manh ? "Có" : "",
    dan_2_Manh: box.dan_2_Manh ? "Có" : "",
    dongGhim1Manh: box.dongGhim1Manh ? "Có" : "",
    dongGhim2Manh: box.dan_2_Manh ? "Có" : "",
    dmWasteLoss: currentBoxTime?.wasteBox || null,
    wasteLossRp: item.wasteLoss,

    // Ca trưởng máy
    shiftManager: item.shiftManagement || "",
    machine: item.machine || currentBoxTime?.machine || null,
  };
};
