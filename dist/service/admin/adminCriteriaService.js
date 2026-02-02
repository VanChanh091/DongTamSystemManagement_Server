"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCriteriaService = void 0;
const qcCriteria_1 = require("../../models/qualityControl/qcCriteria");
const qcRepository_1 = require("../../repository/qcRepository");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
exports.adminCriteriaService = {
    getAllQcCriteria: async (type) => {
        try {
            const allCriteria = await qcRepository_1.qcRepository.getAllQcCriteria(type);
            return { message: `get Qc allCriteria successfully`, data: allCriteria };
        }
        catch (error) {
            console.error("get all Qc Criteria failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createNewCriteria: async (data) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transcation) => {
                const newCriteria = await qcCriteria_1.QcCriteria.create({ ...data }, { transaction: transcation });
                return { message: "Create Qc Criteria successfully", data: newCriteria };
            });
        }
        catch (error) {
            console.error("create Qc Criteria failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateCriteria: async (qcCriteriaId, data) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existingCriteria = await qcRepository_1.qcRepository.findByPk(qcCriteria_1.QcCriteria, qcCriteriaId, transaction);
                if (!existingCriteria) {
                    throw appError_1.AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
                }
                await existingCriteria.update({ ...data });
                return { message: "update Qc Criteria successfully" };
            });
        }
        catch (error) {
            console.error("update Qc Criteria failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteCriteria: async (qcCriteriaId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existingCriteria = await qcRepository_1.qcRepository.findByPk(qcCriteria_1.QcCriteria, qcCriteriaId, transaction);
                if (!existingCriteria) {
                    throw appError_1.AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
                }
                await existingCriteria.destroy({ transaction });
                return { message: "delete Qc Criteria successfully" };
            });
        }
        catch (error) {
            console.error("delete Qc Criteria failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=adminCriteriaService.js.map