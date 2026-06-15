import { Op } from "sequelize";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { DailyReportPerformance } from "../../../models/report/dailyReportPerformance";
import { sequelize } from "../../../assets/configs/connect/database.connect";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";

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

    if (prevReport) {
      //đơn thứ 2 trở đi
      const rawDayReport = prevReport.getDataValue("dayReport");
      const prevDateTime = new Date(rawDayReport);

      durationMinutes = (currentDateTime.getTime() - prevDateTime.getTime()) / (1000 * 60);
    } else {
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
