import { CriteriaBoxCheck } from "../../models/admin/criteriaCheck/criteriaBoxCheck";
import { CriteriaPaperCheck } from "../../models/admin/criteriaCheck/criteriaPaperCheck";
import { qcRepository } from "../../repository/qcRepository";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const adminCriteriaCheckService = {
  getAllCriteriaCheck: async (isPaper: string, machine?: string) => {
    try {
      const model = isPaper === "true" ? CriteriaPaperCheck : CriteriaBoxCheck;

      const allCriteria = await (model as any).findAll({
        where: machine ? { machine } : {},
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });

      return {
        message: `get Qc all Criteria ${isPaper === "true" ? "Paper" : "Box"} check successfully`,
        data: allCriteria,
      };
    } catch (error) {
      console.error("get all Qc Criteria check failed:", error);
      throw AppError.ServerError();
    }
  },

  createNewCriteriaCheck: async (data: any, isPaper: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const model = isPaper === "true" ? CriteriaPaperCheck : CriteriaBoxCheck;
        const newCriteria = await (model as any).create({ ...data }, { transaction });

        return {
          message: `Create Qc Criteria ${isPaper === "true" ? "Paper" : "Box"} check successfully`,
          data: newCriteria,
        };
      });
    } catch (error) {
      console.error("create Qc Criteria check failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateCriteriaCheck: async (id: number, data: any, isPaper: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const model = isPaper === "true" ? CriteriaPaperCheck : CriteriaBoxCheck;

        const existingCriteria = await qcRepository.findByPk(model, id, transaction);
        if (!existingCriteria) {
          throw AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
        }

        await existingCriteria.update({ ...data }, { transaction });

        return {
          message: `update Qc Criteria ${isPaper === "true" ? "Paper" : "Box"} successfully`,
        };
      });
    } catch (error) {
      console.error("update Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteCriteriaCheck: async (id: number, isPaper: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const model = isPaper === "true" ? CriteriaPaperCheck : CriteriaBoxCheck;

        const existingCriteria = await qcRepository.findByPk(model, id, transaction);
        if (!existingCriteria) {
          throw AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
        }

        await existingCriteria.destroy({ transaction });

        return {
          message: `delete Qc Criteria ${isPaper === "true" ? "Paper" : "Box"} successfully`,
        };
      });
    } catch (error) {
      console.error("delete Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
