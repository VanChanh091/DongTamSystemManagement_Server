"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCriteriaCheckService = void 0;
const criteriaBoxCheck_1 = require("../../models/admin/criteriaCheck/criteriaBoxCheck");
const criteriaPaperCheck_1 = require("../../models/admin/criteriaCheck/criteriaPaperCheck");
const qcRepository_1 = require("../../repository/qcRepository");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
exports.adminCriteriaCheckService = {
    getAllCriteriaCheck: async (isPaper, machine) => {
        try {
            const model = isPaper === "true" ? criteriaPaperCheck_1.CriteriaPaperCheck : criteriaBoxCheck_1.CriteriaBoxCheck;
            const allCriteria = await model.findAll({
                where: machine ? { machine } : {},
                attributes: { exclude: ["createdAt", "updatedAt"] },
            });
            return {
                message: `get Qc all Criteria ${isPaper === "true" ? "Paper" : "Box"} check successfully`,
                data: allCriteria,
            };
        }
        catch (error) {
            console.error("get all Qc Criteria check failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createNewCriteriaCheck: async (data, isPaper) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const model = isPaper === "true" ? criteriaPaperCheck_1.CriteriaPaperCheck : criteriaBoxCheck_1.CriteriaBoxCheck;
                const newCriteria = await model.create({ ...data }, { transaction });
                return {
                    message: `Create Qc Criteria ${isPaper === "true" ? "Paper" : "Box"} check successfully`,
                    data: newCriteria,
                };
            });
        }
        catch (error) {
            console.error("create Qc Criteria check failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateCriteriaCheck: async (id, data, isPaper) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const model = isPaper === "true" ? criteriaPaperCheck_1.CriteriaPaperCheck : criteriaBoxCheck_1.CriteriaBoxCheck;
                const existingCriteria = await qcRepository_1.qcRepository.findByPk(model, id, transaction);
                if (!existingCriteria) {
                    throw appError_1.AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
                }
                await existingCriteria.update({ ...data }, { transaction });
                return {
                    message: `update Qc Criteria ${isPaper === "true" ? "Paper" : "Box"} successfully`,
                };
            });
        }
        catch (error) {
            console.error("update Qc Criteria failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteCriteriaCheck: async (id, isPaper) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const model = isPaper === "true" ? criteriaPaperCheck_1.CriteriaPaperCheck : criteriaBoxCheck_1.CriteriaBoxCheck;
                const existingCriteria = await qcRepository_1.qcRepository.findByPk(model, id, transaction);
                if (!existingCriteria) {
                    throw appError_1.AppError.NotFound("QcCriteria not found", "CRITERIA_NOT_FOUND");
                }
                await existingCriteria.destroy({ transaction });
                return {
                    message: `delete Qc Criteria ${isPaper === "true" ? "Paper" : "Box"} successfully`,
                };
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
//# sourceMappingURL=adminCriteriaCheckService.js.map