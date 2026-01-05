import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { qcChecklistData, QcSampleResult } from "../../models/qualityControl/qcSampleResult";
import { QcSession } from "../../models/qualityControl/qcSession";
import { planningRepository } from "../../repository/planningRepository";
import { qcRepository } from "../../repository/qcRepository";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const qcSampleService = {
  getAllQcResult: async (qcSessionId: number) => {
    try {
      const data = await qcRepository.getAllQcResult(qcSessionId);

      return { message: `get QC Result successfully`, data };
    } catch (error) {
      console.error("get all Qc Result failed:", error);
      throw AppError.ServerError();
    }
  },

  getResultByField: async (field: string) => {
    try {
    } catch (error) {
      console.error(`get all QC result by ${field} failed:`, error);
      throw AppError.ServerError();
    }
  },

  createNewResult: async ({
    qcSessionId,
    samples,
    transaction,
  }: {
    qcSessionId: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
    transaction?: any;
  }) => {
    try {
      const session = await qcRepository.findByPk(QcSession, qcSessionId, transaction);
      if (!session) {
        throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
      }

      if (session.status == "finalized") {
        throw AppError.BadRequest("QC session finalized", "QC_SESSION_FINALIZED");
      }

      if (!samples || samples.length === 0) {
        throw AppError.BadRequest("Samples is empty", "SAMPLES_EMPTY");
      }

      if (samples.length !== session.totalSample) {
        throw AppError.BadRequest("Invalid number of samples", "INVALID_SAMPLE_COUNT");
      }

      // ✅ validate sampleIndex range
      for (const r of samples) {
        if (r.sampleIndex < 1 || r.sampleIndex > session.totalSample) {
          throw AppError.BadRequest("Invalid sample index", "INVALID_SAMPLE_INDEX");
        }
      }

      // Validate sampleIndex
      const sampleIndexSet = new Set<number>();
      for (const s of samples) {
        if (s.sampleIndex < 1 || s.sampleIndex > session.totalSample) {
          throw AppError.BadRequest(
            `Invalid sample index ${s.sampleIndex}`,
            "INVALID_SAMPLE_INDEX"
          );
        }

        if (sampleIndexSet.has(s.sampleIndex)) {
          throw AppError.BadRequest(
            `Duplicate sample index ${s.sampleIndex}`,
            "DUPLICATE_SAMPLE_INDEX"
          );
        }

        sampleIndexSet.add(s.sampleIndex);
      }

      // Lấy criteria REQUIRED
      const requiredCriteria = await qcRepository.getRequiredQcCriteria(
        session.processType,
        transaction
      );

      const requiredCriteriaCode = requiredCriteria.map((c) => String(c.criteriaCode));

      // Validate checklist + build rows
      const rowsToUpsert = samples.map((s) => {
        for (const criteriaCode of requiredCriteriaCode) {
          if (!(criteriaCode in s.checklist)) {
            throw AppError.BadRequest(
              `Missing required criteria ${criteriaCode} at sample ${s.sampleIndex}`,
              "MISSING_REQUIRED_CRITERIA"
            );
          }
        }

        const hasFail = Object.values(s.checklist).some((v) => v === false);

        return {
          qcSessionId,
          sampleIndex: s.sampleIndex,
          checklist: s.checklist,
          hasFail,
        };
      });

      await QcSampleResult.bulkCreate(rowsToUpsert, {
        transaction,
        updateOnDuplicate: ["checklist", "hasFail", "updatedAt"],
      });

      const sessionHasFail = rowsToUpsert.some((r) => r.hasFail);

      await session.update({ status: sessionHasFail ? "fail" : "pass" }, { transaction });

      return {
        message: "create QC checklist successfully",
        sessionStatus: sessionHasFail ? "fail" : "pass",
        data: session,
      };
    } catch (error) {
      console.error("create Qc Sample Result failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateResult: async ({
    qcSessionId,
    samples,
  }: {
    qcSessionId: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        // 1️⃣ Lấy session
        const session = await qcRepository.findByPk(QcSession, qcSessionId, transaction);
        if (!session) {
          throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
        }

        if (session.status === "finalized") {
          throw AppError.BadRequest("QC session finalized", "QC_SESSION_FINALIZED");
        }

        // Lấy criteria REQUIRED
        const requiredCriteria = await qcRepository.getRequiredQcCriteria(
          session.processType,
          transaction
        );

        const normalize = (s: string) => s.trim().toUpperCase();
        const requiredCodes = requiredCriteria.map((c) => normalize(c.criteriaCode));

        for (const sample of samples) {
          const { sampleIndex, checklist } = sample;

          if (sampleIndex < 1 || sampleIndex > session.totalSample) {
            throw AppError.BadRequest(
              `Invalid sample index ${sampleIndex}`,
              "INVALID_SAMPLE_INDEX"
            );
          }

          const sampleResult = await planningRepository.getModelById({
            model: QcSampleResult,
            where: { qcSessionId, sampleIndex },
            options: { transaction },
          });
          if (!sampleResult) {
            throw AppError.NotFound(`QC sample ${sampleIndex} not found`, "QC_SAMPLE_NOT_FOUND");
          }

          // Validate checklist REQUIRED
          const checklistKeys = Object.keys(checklist).map(normalize);

          for (const code of requiredCodes) {
            if (!checklistKeys.includes(code)) {
              throw AppError.BadRequest(
                `Missing required criteria ${code} at sample ${sampleIndex}`,
                "MISSING_REQUIRED_CRITERIA"
              );
            }
          }

          // Update sample
          const hasFail = Object.values(checklist).some((v) => v === false);

          await sampleResult.update({ checklist, hasFail }, { transaction });
        }

        // Re-calc trạng thái session (sau khi update tất cả)
        const allSamples = await qcRepository.getAllSample(qcSessionId, transaction);

        const sessionHasFail = allSamples.some((s) => s.hasFail === true);

        await session.update({ status: sessionHasFail ? "fail" : "pass" }, { transaction });

        return {
          message: "update QC checklist successfully",
          data: allSamples,
        };
      });
    } catch (error) {
      console.error("update Qc Result failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmFinalizeSession: async ({
    planningId,
    planningBoxId,
    isPaper = true,
  }: {
    planningId?: number;
    planningBoxId?: number;
    isPaper: boolean;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const session = await planningRepository.getModelById({
          model: QcSession,
          where: isPaper ? { planningId } : { planningBoxId },
          options: { transaction },
        });
        if (!session) {
          throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
        }

        // Check đã finalize chưa
        if (session.status == "finalized") {
          throw AppError.BadRequest("QC session already finalized", "QC_SESSION_ALREADY_FINALIZED");
        }

        // Validate loại session khớp với isPaper
        if (isPaper && !session.planningId) {
          throw AppError.BadRequest(
            "QC session không thuộc planning giấy",
            "INVALID_QC_SESSION_TYPE"
          );
        }

        if (!isPaper && !session.planningBoxId) {
          throw AppError.BadRequest(
            "QC session không thuộc planning thùng",
            "INVALID_QC_SESSION_TYPE"
          );
        }

        //check inbound trước khi finalized
        isPaper
          ? await qcSampleService.assertHasInbound({ key: "planningId", id: session.planningId! })
          : await qcSampleService.assertHasInbound({
              key: "planningBoxId",
              id: session.planningBoxId!,
            });

        await session.update({ status: "finalized" });

        //update status request in planning
        let planning: PlanningPaper | PlanningBox | null = null;

        planning = isPaper
          ? await PlanningPaper.findByPk(session.planningId!, { transaction })
          : await PlanningBox.findByPk(session.planningBoxId!, { transaction });

        if (!planning) {
          throw AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
        }

        //update statusRequest
        if (planning instanceof PlanningPaper) {
          await planning.update({ statusRequest: "finalize" }, { transaction });
        } else if (planning instanceof PlanningBox) {
          await planning.update({ statusRequest: "finalize" }, { transaction });
        }

        //update statusRequest planning
        if (!isPaper && planning instanceof PlanningBox) {
          await planningRepository.updateDataModel({
            model: PlanningPaper,
            data: { statusRequest: "finalize" },
            options: { where: { planningId: planning.planningId }, transaction },
          });
        }

        return { message: "finalize QC session successfully", data: session };
      });
    } catch (error) {
      console.error("create Qc Sample Result failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  assertHasInbound: async ({ key, id }: { key: "planningId" | "planningBoxId"; id: number }) => {
    const inboundSums = await warehouseRepository.getInboundSumByPlanning(key, [id]);
    const totalInbound = inboundSums.length > 0 ? Number(inboundSums[0].totalInbound) || 0 : 0;

    if (totalInbound <= 0) {
      throw AppError.BadRequest(
        "Chưa có giá trị nhập kho, không thể hoàn thành phiên kiểm tra",
        "NO_INBOUND_HISTORY"
      );
    }
  },
};
