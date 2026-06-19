import { Op } from "sequelize";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { DailyReportPerformance } from "../../../models/report/dailyReportPerformance";
import { sequelize } from "../../../assets/configs/connect/database.connect";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { UnifiedPerfInput } from "../../../interface/types";

// Hàm làm tròn số thông minh
const smartRound = (val: number): number => {
  const nextInteger = Math.ceil(val); // Lấy số nguyên kế tiếp
  const distance = nextInteger - val; // Khoảng cách còn thiếu

  // Nếu chỉ thiếu từ 0.03 trở xuống thì làm tròn lên hẳn số nguyên đó
  if (distance > 0 && distance <= 0.03) return nextInteger;

  return Number(val.toFixed(2));
};

//CORE LÕI TÍNH TOÁN CHUNG CHO CẢ 2 HÀM LẤY DỮ LIỆU KHÁC NHAU
const calculatePerformanceSummary = (unifiedData: UnifiedPerfInput[]): Record<string, any> => {
  const summaryByDate: Record<string, any> = {};

  unifiedData.forEach(({ dateKey, fluteLayer, length, duration }) => {
    if (!summaryByDate[dateKey]) {
      summaryByDate[dateKey] = {
        machineTotalLength: 0,
        machineTotalDuration: 0,
        flute: {},
        fluteTotals: {}, // Dùng chung biến tạm cho cả 2 luồng luôn
      };
    }

    const dayGroup = summaryByDate[dateKey];
    dayGroup.machineTotalLength += length;
    dayGroup.machineTotalDuration += duration;

    if (!isNaN(fluteLayer)) {
      if (!dayGroup.fluteTotals[fluteLayer]) {
        dayGroup.fluteTotals[fluteLayer] = { length: 0, duration: 0 };
      }
      dayGroup.fluteTotals[fluteLayer].length += length;
      dayGroup.fluteTotals[fluteLayer].duration += duration;
    }
  });

  // Tính toán kết quả cuối cùng
  Object.keys(summaryByDate).forEach((dateKey) => {
    const dayGroup = summaryByDate[dateKey];

    dayGroup.machineSpeed =
      dayGroup.machineTotalDuration > 0
        ? smartRound(dayGroup.machineTotalLength / dayGroup.machineTotalDuration)
        : 0;

    Object.keys(dayGroup.fluteTotals).forEach((wave) => {
      const { length, duration } = dayGroup.fluteTotals[wave];
      dayGroup.flute[wave] = duration > 0 ? smartRound(length / duration) : 0;
    });

    // Clean các biến tạm
    delete dayGroup.machineTotalLength;
    delete dayGroup.machineTotalDuration;
    delete dayGroup.fluteTotals;
  });

  return summaryByDate;
};

// HÀM 1: Dùng cho get all - lấy từ daily report performance
export const getPerformanceSummaryByRows = async (
  rows: any[],
  machine: string,
): Promise<Record<string, any>> => {
  if (!rows || rows.length === 0) return {};

  const distinctDates = [
    ...new Set(rows.map((r: any) => new Date(r.dayReport).toISOString().split("T")[0])),
  ];

  const perfData = await DailyReportPerformance.findAll({
    where: { machine, dayReport: { [Op.in]: distinctDates } },
    attributes: { exclude: ["createdAt", "updatedAt"] },
    raw: true,
  });

  // Chuẩn hóa data từ bảng phụ về dạng chung
  const unifiedData: UnifiedPerfInput[] = perfData.map((item: any) => ({
    dateKey: item.dayReport,
    fluteLayer: parseInt(item.flute),
    length: Number(item.totalLength) || 0,
    duration: Number(item.totalDurations) || 0,
  }));

  // Đẩy vào lõi tính toán
  return calculatePerformanceSummary(unifiedData);
};

// HÀM 2: Lấy trực tiếp từ kết quả Meilisearch để tính toán
export const getPerformanceSearchSummary = (searchRows: any[]): Record<string, any> => {
  if (!searchRows || searchRows.length === 0) return {};

  // Chuẩn hóa data từ các đơn hàng về dạng chung
  const unifiedData: UnifiedPerfInput[] = searchRows.map((row: any) => {
    const fluteRaw = row.PlanningPaper?.Order?.flute || "";

    return {
      dateKey: new Date(row.dayReport).toISOString().split("T")[0],
      fluteLayer: parseInt(fluteRaw.charAt(0)),
      length: Number(row.totalLength) || 0,
      duration: Number(row.durations) || 0,
    };
  });

  // Đẩy vào lõi tính toán
  return calculatePerformanceSummary(unifiedData);
};

// HÀM 3: Tạo báo cáo mới và cập nhật performance
export const createReportPlanning = async ({
  planning,
  model,
  qtyProduced,
  qtyWasteNorm,
  dayReportValue,
  shiftManagementBox = "",
  machine = "",
  reportedBy,
  totalPrice,
  otherData,
  transaction,
  isBox = false,
}: {
  planning: any;
  model: any;
  qtyProduced: number;
  qtyWasteNorm?: number;
  dayReportValue: Date | string;
  shiftManagementBox?: string;
  machine?: string;
  reportedBy: string;
  totalPrice: number;
  otherData?: {
    shiftProduction: string;
    shiftManagement: string;
  };
  transaction: any;
  isBox?: boolean;
}) => {
  //condition to get id
  const whereCondition = isBox
    ? {
        planningBoxId: planning.PlanningBox.planningBoxId,
        machine: machine,
      }
    : {
        planningId: planning.planningId,
      };

  //total qtyProduced
  const producedSoFar =
    (await model.sum("qtyProduced", {
      where: whereCondition,
      transaction,
    })) || 0;

  // Cộng thêm sản lượng lần này
  const totalProduced = producedSoFar + Number(qtyProduced || 0);

  // Tính số lượng còn thiếu
  let lackOfQtyValue = planning.runningPlan - totalProduced;

  let report;

  if (isBox) {
    report = await model.create(
      {
        planningBoxId: planning.PlanningBox.planningBoxId,
        dayReport: dayReportValue,
        qtyProduced: qtyProduced,
        lackOfQty: lackOfQtyValue,
        wasteLoss: qtyWasteNorm,
        shiftManagement: shiftManagementBox,
        machine: machine,
        reportedBy: reportedBy,
      },
      { transaction },
    );
  } else {
    let totalLength = 0;
    let durationMinutes = 0;
    let speed = 0;

    const currentMachine = planning.chooseMachine;
    const currentDateTime = new Date(dayReportValue);

    const length = (planning.lengthPaperPlanning || 0) / 100;
    const child = planning.numberChild || 1;

    const prevReport = await model.findOne({
      where: { dayReport: { [Op.lt]: currentDateTime } },
      attributes: ["reportPaperId", "dayReport"],
      include: [
        {
          model: PlanningPaper,
          attributes: ["chooseMachine"],
          where: { chooseMachine: currentMachine },
        },
      ],
      order: [["dayReport", "DESC"]], // Lấy báo cáo mới nhất
      transaction,
    });

    let calculatedFromPrev = false;

    if (prevReport) {
      //đơn thứ 2 trở đi
      const rawDayReport = prevReport.getDataValue("dayReport");
      const prevDateTime = new Date(rawDayReport);
      const diffMinutes = (currentDateTime.getTime() - prevDateTime.getTime()) / (1000 * 60);

      // Nếu thời gian chờ vượt quá 8 tiếng, coi như là bắt đầu ngày mới/ca mới
      const MAX_IDLE_MINUTES = 480;

      if (diffMinutes > 0 && diffMinutes <= MAX_IDLE_MINUTES) {
        durationMinutes = diffMinutes;
        calculatedFromPrev = true;
      }
    }

    // Nếu là đơn đầu tiên của ngày mới/ca mới
    if (!calculatedFromPrev) {
      if (planning.timeStart) {
        const startDateTime = new Date(currentDateTime); // Tạo bản sao cùng ngày
        const [hours, minutes, seconds] = planning.timeStart.split(":").map(Number);

        // Thiết lập lại giờ chạy cho đúng mốc bấm nút START dưới xưởng
        startDateTime.setHours(hours, minutes, seconds || 0, 0);
        durationMinutes = (currentDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
      } else {
        durationMinutes = 0;
      }
    }

    // Giới hạn an toàn chống số âm nếu có lỗi lệch múi giờ hệ thống
    if (durationMinutes < 0) durationMinutes = 0;

    planning?.Order?.dvt === "Kg"
      ? (totalLength = Number(qtyProduced || 0))
      : (totalLength = (Number(qtyProduced || 0) * length) / child);

    const parseTotalLength = Math.round(totalLength * 100) / 100;
    const parseDuration = Math.ceil(durationMinutes);

    speed = durationMinutes > 0 ? Math.round((parseTotalLength / parseDuration) * 100) / 100 : 0;

    // console.log(`Báo cáo trước đó tồn tại: ${prevReport ? "CÓ" : "KHÔNG (Đầu ngày)"}`);
    // console.log(`Thời gian đơn hiện tại: ${currentDateTime}`);
    // if (prevReport) console.log(`Thời gian đơn trước đó: ${prevReport.getDataValue("dayReport")}`);
    // console.log(`Thời gian máy chạy thực tế: ${durationMinutes.toFixed(2)} phút`);
    // console.log(`Sản lượng lượt này: ${qtyProduced} | Dài: ${length} | Số con: ${child}`);
    // console.log(`Tổng dài phát sinh: ${totalLength}`);
    // console.log(`Tốc độ lượt này: ${speed} m/p`);
    // console.log(`=========================================================`);

    report = await model.create(
      {
        planningId: planning.planningId,
        dayReport: dayReportValue,
        qtyProduced: qtyProduced,
        lackOfQty: lackOfQtyValue,
        shiftProduction: otherData!.shiftProduction,
        shiftManagement: otherData!.shiftManagement,
        reportedBy: reportedBy,
        totalPrice: totalPrice,
        totalLength: parseTotalLength,
        durations: parseDuration,
        averageSpeed: speed,
      },
      { transaction },
    );

    //Ghi dữ liệu vào report performances
    const machine = planning.chooseMachine;
    const rawFlute = planning.Order?.flute;
    const waveLayer = rawFlute ? parseInt(rawFlute, 10) : 0;

    const [affectedRows] = await DailyReportPerformance.update(
      {
        totalLength: sequelize.literal(`totalLength + ${parseTotalLength}`),
        totalDurations: sequelize.literal(`totalDurations + ${parseDuration}`),
      },
      {
        where: {
          dayReport: currentDateTime,
          machine: machine,
          flute: waveLayer,
        },
      },
    );

    if (affectedRows === 0) {
      await DailyReportPerformance.create({
        dayReport: dayjsUtc(currentDateTime).toDate(),
        machine: machine,
        flute: waveLayer,
        totalLength: parseTotalLength,
        totalDurations: parseDuration,
      });
    }
  }

  return {
    report,
    producedSoFar,
    totalProduced,
    lackOfQtyValue,
  };
};
