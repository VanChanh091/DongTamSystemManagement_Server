import { QcCriteria } from "../models/qualityControl/qcCriteria";
import { QcSampleResult } from "../models/qualityControl/qcSampleResult";
import { QcSession } from "../models/qualityControl/qcSession";

export const qcRepository = {
  //===============================CRITERIA=================================
  getAllQcCriteria: async (type: string) => {
    return await QcCriteria.findAll({
      where: { processType: type },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },

  findByPk: async (model: any, id: number, transaction: any) => {
    return await model.findByPk(id, { transaction });
  },

  //===============================SESSION=================================

  getAllQcSession: async () => {
    return await QcSession.findAll({
      order: [["createdAt", "DESC"]],
    });
  },

  findOneSession: async (whereCondition: any) => {
    return await QcSession.findOne({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: QcSampleResult,
          as: "samples",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });
  },

  createNewSession: async (data: any, transaction: any) => {
    return await QcSession.create(data, { transaction });
  },

  //===============================SAMPLE=================================
  getAllQcResult: async (qcSessionId: number) => {
    return await QcSampleResult.findAll({
      where: { qcSessionId },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [["sampleIndex", "ASC"]],
    });
  },

  getAllSample: async (qcSessionId: number, transaction: any) => {
    return await QcSampleResult.findAll({
      where: { qcSessionId },
      attributes: ["hasFail"],
      transaction,
    });
  },

  getRequiredQcCriteria: async (processType: string, transaction: any) => {
    return await QcCriteria.findAll({
      where: {
        processType: processType,
        isRequired: true,
      },
      attributes: ["criteriaCode"],
      transaction,
    });
  },
};
