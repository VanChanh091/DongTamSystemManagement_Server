"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReportPlanning = void 0;
const createReportPlanning = async ({ planning, model, qtyProduced, qtyWasteNorm, dayReportValue, shiftManagementBox = "", machine = "", reportedBy, otherData, transaction, isBox = false, }) => {
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
    const producedSoFar = (await model.sum("qtyProduced", {
        where: whereCondition,
        transaction,
    })) || 0;
    // Cộng thêm sản lượng lần này
    const totalProduced = producedSoFar + Number(qtyProduced || 0);
    // Tính số lượng còn thiếu
    let lackOfQtyValue = planning.runningPlan - totalProduced;
    let report;
    if (isBox) {
        //box
        report = await model.create({
            planningBoxId: planning.PlanningBox.planningBoxId,
            dayReport: dayReportValue,
            qtyProduced: qtyProduced,
            lackOfQty: lackOfQtyValue,
            wasteLoss: qtyWasteNorm,
            shiftManagement: shiftManagementBox,
            machine: machine,
            reportedBy: reportedBy,
        }, { transaction });
    }
    else {
        // paper
        report = await model.create({
            planningId: planning.planningId,
            dayReport: dayReportValue,
            qtyProduced: qtyProduced,
            lackOfQty: lackOfQtyValue,
            qtyWasteNorm: qtyWasteNorm,
            shiftProduction: otherData.shiftProduction,
            shiftManagement: otherData.shiftManagement,
            reportedBy: reportedBy,
        }, { transaction });
    }
    return {
        report,
        producedSoFar,
        totalProduced,
        lackOfQtyValue,
    };
};
exports.createReportPlanning = createReportPlanning;
//# sourceMappingURL=reportHelper.js.map