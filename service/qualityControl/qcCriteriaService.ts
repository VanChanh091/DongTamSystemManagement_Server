import {
  processTypeQC,
  QcCriteria,
  QcCriteriaAttributes,
} from "../../models/qualityControl/qcCriteria";
import { AppError } from "../../utils/appError";

export const qcCriteriaService = {
  getAllQcCriteria: async (type: processTypeQC) => {
    try {
      const allCriteria = await QcCriteria.findAll({
        where: { processType: type },
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });

      return { message: `get Qc allCriteria successfully`, data: allCriteria };
    } catch (error) {
      console.error("get all Qc Criteria failed:", error);
      throw AppError.ServerError();
    }
  },

  createNewCriteria: async (data: QcCriteriaAttributes) => {
    const transaction = await QcCriteria.sequelize?.transaction();

    try {
      const newCriteria = await QcCriteria.create(data);

      await transaction?.commit();

      return { message: "Create Qc Criteria successfully", data: newCriteria };
    } catch (error) {
      await transaction?.rollback();
      console.error("create Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateCriteria: async (qcCriteriaId: number, data: QcCriteriaAttributes) => {
    const transaction = await QcCriteria.sequelize?.transaction();

    try {
      const existingCriteria = await QcCriteria.findByPk(qcCriteriaId, { transaction });
      if (!existingCriteria) {
        throw AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
      }

      await existingCriteria.update({ ...data });

      await transaction?.commit();

      return { message: "update Qc Criteria successfully" };
    } catch (error) {
      await transaction?.rollback();
      console.error("update Qc Criteria failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
