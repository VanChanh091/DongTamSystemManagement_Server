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
  // const totalPrice;

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
      },
      { transaction },
    );
  }

  return {
    report,
    producedSoFar,
    totalProduced,
    lackOfQtyValue,
  };
};
