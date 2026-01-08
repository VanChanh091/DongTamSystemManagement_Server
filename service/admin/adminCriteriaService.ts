import {
  processTypeQC,
  QcCriteria,
  QcCriteriaCreationAttributes,
} from "../../models/qualityControl/qcCriteria";
import { qcRepository } from "../../repository/qcRepository";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const adminCriteriaService = {
  getAllQcCriteria: async (type: processTypeQC) => {
    try {
      const allCriteria = await qcRepository.getAllQcCriteria(type);

      return { message: `get Qc allCriteria successfully`, data: allCriteria };
    } catch (error) {
      console.error("get all Qc Criteria failed:", error);
      throw AppError.ServerError();
    }
  },

  createNewCriteria: async (data: QcCriteriaCreationAttributes) => {
    try {
      return await runInTransaction(async (transcation) => {
        const newCriteria = await QcCriteria.create({ ...data }, { transaction: transcation });

        return { message: "Create Qc Criteria successfully", data: newCriteria };
      });
    } catch (error) {
      console.error("create Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateCriteria: async (qcCriteriaId: number, data: QcCriteriaCreationAttributes) => {
    try {
      return await runInTransaction(async (transaction) => {
        const existingCriteria = await qcRepository.findByPk(QcCriteria, qcCriteriaId, transaction);
        if (!existingCriteria) {
          throw AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
        }

        await existingCriteria.update({ ...data });

        return { message: "update Qc Criteria successfully" };
      });
    } catch (error) {
      console.error("update Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteCriteria: async (qcCriteriaId: number) => {
    try {
      return await runInTransaction(async (transaction) => {
        const existingCriteria = await qcRepository.findByPk(QcCriteria, qcCriteriaId, transaction);
        if (!existingCriteria) {
          throw AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
        }

        await existingCriteria.destroy({ transaction });

        return { message: "delete Qc Criteria successfully" };
      });
    } catch (error) {
      console.error("delete Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
