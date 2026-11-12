import { AppError } from "../../appError";
import { isTwoLayerMachine, machineLabels, MEILI_INDEX } from "../../../assets/labelFields";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../../models/planning/timeOverflowPlanning";
import { planningPaperRepository } from "../../../repository/planning/planningPaperRepository";
import { meiliService } from "../../../service/system/meiliService";
import { runInTransaction } from "../transactionHelper";
import { Order } from "../../../models/order/order";
import { PaperRequirements } from "../../../models/planning/requirement/paperRequirements";
import { Op, Transaction } from "sequelize";
import { CrudHelper } from "../../../repository/helper/crud.helper.repository";
import { MachinePaper } from "../../../models/admin/machinePaper";

export const aggregateReportFields = (reports: any[]) => {
  const shiftProductions = new Set<string>();
  const shiftManagements = new Set<string>();

  reports.forEach((r) => {
    if (r.shiftProduction) shiftProductions.add(r.shiftProduction);
    if (r.shiftManagement) shiftManagements.add(r.shiftManagement);
  });

  return {
    // Chuyển Set thành chuỗi, ngăn cách bởi dấu phẩy
    combinedShiftProduction: Array.from(shiftProductions).join(", "),
    combinedShiftManagement: Array.from(shiftManagements).join(", "),
  };
};

export const updateStatusPaper = async ({
  planningId,
  targetStatus,
  extraValidator,
}: {
  planningId: number | number[];
  targetStatus: "requested" | "complete";
  extraValidator: (papers: PlanningPaper[]) => void;
}) => {
  return await runInTransaction(async (transaction) => {
    const ids = Array.isArray(planningId) ? planningId : [planningId];

    const planningPapers = await planningPaperRepository.getPapersById({
      planningIds: ids,
      options: {
        attributes: [
          "planningId",
          "runningPlan",
          "qtyProduced",
          "qtyWasteNorm",
          "status",
          "orderId",
          "statusRequest",
        ],
        include: [{ model: Order, attributes: ["quantityManufacture"] }],
      },
      transaction,
    });

    if (planningPapers.length !== ids.length) {
      throw AppError.BadRequest("Một hoặc nhiều planning không tồn tại", "PLANNING_NOT_FOUND");
    }

    // Thực thi validator riêng
    extraValidator(planningPapers);

    await CrudHelper.updateData({
      model: PlanningPaper,
      data: { status: targetStatus },
      options: { where: { planningId: ids }, transaction },
    });

    const overflowRows = await timeOverflowPlanning.findAll({
      where: { planningId: ids },
      transaction,
    });

    if (overflowRows.length > 0) {
      await CrudHelper.updateData({
        model: timeOverflowPlanning,
        data: { status: targetStatus },
        options: { where: { planningId: ids }, transaction },
      });
    }

    if (targetStatus === "complete") {
      //cập nhật status cho paperRequiments
      await CrudHelper.updateData({
        model: PaperRequirements,
        data: { status: "COMPLETED" },
        options: { where: { planningId: { [Op.in]: ids } }, transaction },
      });
    }

    //--------------------MEILISEARCH-----------------------
    const dataForMeili = planningPapers.map((p) => ({
      planningId: p.planningId,
      status: targetStatus,
    }));

    await meiliService.syncOrUpdateMeiliData({
      indexKey: MEILI_INDEX.PLANNING_PAPERS,
      data: dataForMeili,
      transaction,
      isUpdate: true,
    });

    return { message: `Planning status updated to ${targetStatus}`, ids };
  });
};

export const assertPaperMachinePermission = async ({
  machine,
  role,
  userPermissions,
  skipPermissionCheck = false,
  denyMode = "unauthorized",
  denyMessage,
  transaction,
}: {
  machine: string;
  role: string;
  userPermissions: string[];
  skipPermissionCheck?: boolean;
  denyMode?: "unauthorized" | "forbidden";
  denyMessage: string;
  transaction?: Transaction;
}) => {
  const normalizedMachine = machine?.trim();
  if (!normalizedMachine) {
    throw AppError.BadRequest("Invalid machine: empty", "INVALID_MACHINE");
  }

  let machineLabel = machineLabels[normalizedMachine];
  if (!machineLabel) {
    const existingMachine = await MachinePaper.findOne({
      where: { machineName: normalizedMachine },
      attributes: ["machineId"],
      transaction,
    });
    if (!existingMachine) {
      throw AppError.BadRequest(`Invalid machine: ${machine}`, "INVALID_MACHINE");
    }
    machineLabel = isTwoLayerMachine(normalizedMachine) ? "machine2Layer" : "production";
  }

  if (role !== "admin" && role !== "manager" && !skipPermissionCheck) {
    if (!userPermissions.includes(machineLabel)) {
      if (denyMode === "forbidden") {
        throw AppError.Forbidden(denyMessage, "ACCESS_DENIED");
      }
      throw AppError.Unauthorized(denyMessage, "ACCESS_DENIED");
    }
  }
};
