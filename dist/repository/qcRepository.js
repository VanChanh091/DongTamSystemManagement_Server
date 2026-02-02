"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcRepository = void 0;
const qcCriteria_1 = require("../models/qualityControl/qcCriteria");
const qcSampleResult_1 = require("../models/qualityControl/qcSampleResult");
const qcSession_1 = require("../models/qualityControl/qcSession");
exports.qcRepository = {
    //===============================CRITERIA=================================
    getAllQcCriteria: async (type) => {
        return await qcCriteria_1.QcCriteria.findAll({
            where: { processType: type },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    },
    findByPk: async (model, id, transaction) => {
        return await model.findByPk(id, { transaction });
    },
    //===============================SESSION=================================
    getAllQcSession: async () => {
        return await qcSession_1.QcSession.findAll({
            order: [["createdAt", "DESC"]],
        });
    },
    findOneSession: async (whereCondition) => {
        return await qcSession_1.QcSession.findOne({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: qcSampleResult_1.QcSampleResult,
                    as: "samples",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
        });
    },
    createNewSession: async (data, transaction) => {
        return await qcSession_1.QcSession.create(data, { transaction });
    },
    //===============================SAMPLE=================================
    getAllQcResult: async (qcSessionId) => {
        return await qcSampleResult_1.QcSampleResult.findAll({
            where: { qcSessionId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            order: [["sampleIndex", "ASC"]],
        });
    },
    getAllSample: async (qcSessionId, transaction) => {
        return await qcSampleResult_1.QcSampleResult.findAll({
            where: { qcSessionId },
            attributes: ["hasFail"],
            transaction,
        });
    },
    getRequiredQcCriteria: async (processType, transaction) => {
        return await qcCriteria_1.QcCriteria.findAll({
            where: {
                processType: processType,
                isRequired: true,
            },
            attributes: ["criteriaCode"],
            transaction,
        });
    },
};
//# sourceMappingURL=qcRepository.js.map