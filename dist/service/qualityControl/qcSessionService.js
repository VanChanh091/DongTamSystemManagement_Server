"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcSessionService = void 0;
const qcSession_1 = require("../../models/qualityControl/qcSession");
const user_1 = require("../../models/user/user");
const planningRepository_1 = require("../../repository/planningRepository");
const qcRepository_1 = require("../../repository/qcRepository");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
exports.qcSessionService = {
    getAllQcSession: async () => {
        try {
            const allSession = await qcRepository_1.qcRepository.getAllQcSession();
            return { message: `get Qc allCriteria successfully`, data: allSession };
        }
        catch (error) {
            console.error("get all QC session failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getSessionByFk: async ({ planningId, planningBoxId, }) => {
        try {
            if (!planningId && !planningBoxId) {
                throw appError_1.AppError.BadRequest("planningId or planningBoxId is required", "MISSING_FK");
            }
            if (planningId && planningBoxId) {
                throw appError_1.AppError.BadRequest("Only one of planningId or planningBoxId is allowed", "INVALID_FK");
            }
            const whereCondition = planningId ? { planningId } : { planningBoxId };
            const session = await qcRepository_1.qcRepository.findOneSession(whereCondition);
            return { message: "get QC session successfully", data: session };
        }
        catch (error) {
            console.error("get all QC session failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getSessionByField: async (field) => {
        try {
        }
        catch (error) {
            console.error(`get all QC session by ${field} failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    createNewSession: async ({ processType, planningId, planningBoxId, totalSample = 3, transaction, user, }) => {
        const { userId } = user;
        try {
            // validate FK
            if (processType === "paper" && !planningId) {
                throw appError_1.AppError.BadRequest("planningId is required for paper QC", "PLANNINGID_IS_REQUIRED");
            }
            if (processType === "box" && !planningBoxId) {
                throw appError_1.AppError.BadRequest("planningBoxId is required for box QC", "PLANNINGBOXID_IS_REQUIRED");
            }
            if (totalSample !== undefined && totalSample < 1) {
                throw appError_1.AppError.BadRequest("totalSample must be greater than 0", "TOTAL_SAMPLE_MUST_BE_GREATER_THAN_0");
            }
            const existedUser = await planningRepository_1.planningRepository.getModelById({ model: user_1.User, where: { userId } });
            if (!existedUser) {
                throw appError_1.AppError.BadRequest("user not found", "USER_NOT_FOUND");
            }
            //create session
            const session = await qcRepository_1.qcRepository.createNewSession({
                processType,
                planningId: processType === "paper" ? planningId : null,
                planningBoxId: processType === "box" ? planningBoxId : null,
                totalSample,
                checkedBy: existedUser.fullName,
                status: "checking",
            }, transaction);
            return { message: "create QC Session successfully", data: session };
        }
        catch (error) {
            console.error("create QC session failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateSession: async ({ qcSessionId, status, totalSample, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const session = await qcRepository_1.qcRepository.findByPk(qcSession_1.QcSession, qcSessionId, transaction);
                if (!session) {
                    throw appError_1.AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
                }
                if (totalSample !== undefined && totalSample < 1) {
                    throw appError_1.AppError.BadRequest("totalSample must be greater than 0");
                }
                await session.update({
                    status: status ?? session.status,
                    totalSample: totalSample ?? session.totalSample,
                });
                return { message: `update QC Session id=${qcSessionId} successfully`, data: session };
            });
        }
        catch (error) {
            console.error("update QC session failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=qcSessionService.js.map