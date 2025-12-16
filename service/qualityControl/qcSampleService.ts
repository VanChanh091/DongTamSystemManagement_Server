import { QcCriteria } from "../../models/qualityControl/qcCriteria";
import { qcChecklistData, QcSampleResult } from "../../models/qualityControl/qcSampleResult";
import { QcSession } from "../../models/qualityControl/qcSession";
import { AppError } from "../../utils/appError";

export const qcSampleService = {
  getAllQcResult: async (qcSessionId: number) => {
    try {
      const data = await QcSampleResult.findAll({
        where: { qcSessionId },
        attributes: { exclude: ["createdAt", "updatedAt"] },
        order: [["sampleIndex", "ASC"]],
      });

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
  }: {
    qcSessionId: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
  }) => {
    const transaction = await QcSampleResult.sequelize?.transaction();

    try {
      const session = await QcSession.findByPk(qcSessionId, { transaction });
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
      const requiredCriteria = await QcCriteria.findAll({
        where: {
          processType: session.processType,
          isRequired: true,
        },
        attributes: ["criteriaCode"],
        transaction,
      });

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

      await transaction?.commit();
      return {
        message: "create QC checklist successfully",
        data: session,
      };
    } catch (error) {
      await transaction?.rollback();
      console.error("create Qc Sample Result failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateResult: async ({
    qcSessionId,
    sampleIndex,
    checklist,
  }: {
    qcSessionId: number;
    sampleIndex: number;
    checklist: Record<string, boolean>;
  }) => {
    const transaction = await QcSampleResult.sequelize?.transaction();

    try {
      const session = await QcSession.findByPk(qcSessionId, { transaction });
      if (!session) {
        throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
      }

      if (session.status == "finalized") {
        throw AppError.BadRequest("QC session finalized", "QC_SESSION_FINALIZED");
      }

      // Validate sampleIndex
      if (sampleIndex < 1 || sampleIndex > session.totalSample) {
        throw AppError.BadRequest("Invalid sample index", "INVALID_SAMPLE_INDEX");
      }

      // Lấy sample result
      const sampleResult = await QcSampleResult.findOne({
        where: {
          qcSessionId,
          sampleIndex,
        },
        transaction,
      });

      if (!sampleResult) {
        throw AppError.NotFound(`QC sample ${sampleIndex} not found`, "QC_SAMPLE_NOT_FOUND");
      }

      // Lấy criteria REQUIRED
      const requiredCriteria = await QcCriteria.findAll({
        where: {
          processType: session.processType,
          isRequired: true,
        },
        attributes: ["criteriaCode"],
        transaction,
      });

      const normalize = (s: string) => s.trim().toUpperCase();
      const checklistKeys = Object.keys(checklist).map(normalize);
      const requiredCodes = requiredCriteria.map((c) => normalize(c.criteriaCode));

      // Validate checklist
      for (const code of requiredCodes) {
        if (!checklistKeys.includes(code)) {
          throw AppError.BadRequest(
            `Missing required criteria ${code} at sample ${sampleIndex}`,
            "MISSING_REQUIRED_CRITERIA"
          );
        }
      }

      // Update sample checklist
      const hasFail = Object.values(checklist).some((v) => v === false);

      await sampleResult.update(
        {
          checklist,
          hasFail,
        },
        { transaction }
      );

      // Re-calc trạng thái session
      const allSamples = await QcSampleResult.findAll({
        where: { qcSessionId },
        attributes: ["hasFail"],
        transaction,
      });

      const sessionHasFail = allSamples.some((s) => s.hasFail === true);

      await session.update({ status: sessionHasFail ? "fail" : "pass" }, { transaction });

      await transaction?.commit();
      return {
        message: "update QC checklist successfully",
        data: sampleResult,
      };
    } catch (error) {
      await transaction?.rollback();
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
    const transaction = await QcSession.sequelize?.transaction();

    try {
      const session = await QcSession.findOne({
        where: isPaper ? { planningId } : { planningBoxId },
        transaction,
      });
      if (!session) {
        throw AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
      }

      if (session.status == "finalized") {
        throw AppError.BadRequest("QC session already finalized", "QC_SESSION_ALREADY_FINALIZED");
      }

      await session.update({ status: "finalized" });

      return {
        message: "finalize QC session successfully",
        data: session,
      };
    } catch (error) {
      await transaction?.rollback();
      console.error("create Qc Sample Result failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
