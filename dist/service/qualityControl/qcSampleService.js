"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcSampleService = void 0;
const planningBox_1 = require("../../models/planning/planningBox");
const planningPaper_1 = require("../../models/planning/planningPaper");
const qcSampleResult_1 = require("../../models/qualityControl/qcSampleResult");
const qcSession_1 = require("../../models/qualityControl/qcSession");
const planningRepository_1 = require("../../repository/planningRepository");
const qcRepository_1 = require("../../repository/qcRepository");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
exports.qcSampleService = {
    getAllQcResult: async (qcSessionId) => {
        try {
            const data = await qcRepository_1.qcRepository.getAllQcResult(qcSessionId);
            return { message: `get QC Result successfully`, data };
        }
        catch (error) {
            console.error("get all Qc Result failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getResultByField: async (field) => {
        try {
        }
        catch (error) {
            console.error(`get all QC result by ${field} failed:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    createNewResult: async ({ qcSessionId, samples, transaction, }) => {
        try {
            const session = await qcRepository_1.qcRepository.findByPk(qcSession_1.QcSession, qcSessionId, transaction);
            if (!session) {
                throw appError_1.AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
            }
            if (session.status == "finalized") {
                throw appError_1.AppError.BadRequest("QC session finalized", "QC_SESSION_FINALIZED");
            }
            if (!samples || samples.length === 0) {
                throw appError_1.AppError.BadRequest("Samples is empty", "SAMPLES_EMPTY");
            }
            if (samples.length !== session.totalSample) {
                throw appError_1.AppError.BadRequest("Invalid number of samples", "INVALID_SAMPLE_COUNT");
            }
            // ✅ validate sampleIndex range
            for (const r of samples) {
                if (r.sampleIndex < 1 || r.sampleIndex > session.totalSample) {
                    throw appError_1.AppError.BadRequest("Invalid sample index", "INVALID_SAMPLE_INDEX");
                }
            }
            // Validate sampleIndex
            const sampleIndexSet = new Set();
            for (const s of samples) {
                if (s.sampleIndex < 1 || s.sampleIndex > session.totalSample) {
                    throw appError_1.AppError.BadRequest(`Invalid sample index ${s.sampleIndex}`, "INVALID_SAMPLE_INDEX");
                }
                if (sampleIndexSet.has(s.sampleIndex)) {
                    throw appError_1.AppError.BadRequest(`Duplicate sample index ${s.sampleIndex}`, "DUPLICATE_SAMPLE_INDEX");
                }
                sampleIndexSet.add(s.sampleIndex);
            }
            // Lấy criteria REQUIRED
            const requiredCriteria = await qcRepository_1.qcRepository.getRequiredQcCriteria(session.processType, transaction);
            const requiredCriteriaCode = requiredCriteria.map((c) => String(c.criteriaCode));
            // Validate checklist + build rows
            const rowsToUpsert = samples.map((s) => {
                for (const criteriaCode of requiredCriteriaCode) {
                    if (!(criteriaCode in s.checklist)) {
                        throw appError_1.AppError.BadRequest(`Missing required criteria ${criteriaCode} at sample ${s.sampleIndex}`, "MISSING_REQUIRED_CRITERIA");
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
            await qcSampleResult_1.QcSampleResult.bulkCreate(rowsToUpsert, {
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
        }
        catch (error) {
            console.error("create Qc Sample Result failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateResult: async ({ qcSessionId, samples, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // 1️⃣ Lấy session
                const session = await qcRepository_1.qcRepository.findByPk(qcSession_1.QcSession, qcSessionId, transaction);
                if (!session) {
                    throw appError_1.AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
                }
                if (session.status === "finalized") {
                    throw appError_1.AppError.BadRequest("QC session finalized", "QC_SESSION_FINALIZED");
                }
                // Lấy criteria REQUIRED
                const requiredCriteria = await qcRepository_1.qcRepository.getRequiredQcCriteria(session.processType, transaction);
                const normalize = (s) => s.trim().toUpperCase();
                const requiredCodes = requiredCriteria.map((c) => normalize(c.criteriaCode));
                for (const sample of samples) {
                    const { sampleIndex, checklist } = sample;
                    if (sampleIndex < 1 || sampleIndex > session.totalSample) {
                        throw appError_1.AppError.BadRequest(`Invalid sample index ${sampleIndex}`, "INVALID_SAMPLE_INDEX");
                    }
                    const sampleResult = await planningRepository_1.planningRepository.getModelById({
                        model: qcSampleResult_1.QcSampleResult,
                        where: { qcSessionId, sampleIndex },
                        options: { transaction },
                    });
                    if (!sampleResult) {
                        throw appError_1.AppError.NotFound(`QC sample ${sampleIndex} not found`, "QC_SAMPLE_NOT_FOUND");
                    }
                    // Validate checklist REQUIRED
                    const checklistKeys = Object.keys(checklist).map(normalize);
                    for (const code of requiredCodes) {
                        if (!checklistKeys.includes(code)) {
                            throw appError_1.AppError.BadRequest(`Missing required criteria ${code} at sample ${sampleIndex}`, "MISSING_REQUIRED_CRITERIA");
                        }
                    }
                    // Update sample
                    const hasFail = Object.values(checklist).some((v) => v === false);
                    await sampleResult.update({ checklist, hasFail }, { transaction });
                }
                // Re-calc trạng thái session (sau khi update tất cả)
                const allSamples = await qcRepository_1.qcRepository.getAllSample(qcSessionId, transaction);
                const sessionHasFail = allSamples.some((s) => s.hasFail === true);
                await session.update({ status: sessionHasFail ? "fail" : "pass" }, { transaction });
                return {
                    message: "update QC checklist successfully",
                    data: allSamples,
                };
            });
        }
        catch (error) {
            console.error("update Qc Result failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmFinalizeSession: async ({ planningId, planningBoxId, isPaper = true, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const session = await planningRepository_1.planningRepository.getModelById({
                    model: qcSession_1.QcSession,
                    where: isPaper ? { planningId } : { planningBoxId },
                    options: { transaction },
                });
                if (!session) {
                    throw appError_1.AppError.NotFound("QC session not found", "QC_SESSION_NOT_FOUND");
                }
                // Check đã finalize chưa
                if (session.status == "finalized") {
                    throw appError_1.AppError.BadRequest("QC session already finalized", "QC_SESSION_ALREADY_FINALIZED");
                }
                // Validate loại session khớp với isPaper
                if (isPaper && !session.planningId) {
                    throw appError_1.AppError.BadRequest("QC session không thuộc planning giấy", "INVALID_QC_SESSION_TYPE");
                }
                if (!isPaper && !session.planningBoxId) {
                    throw appError_1.AppError.BadRequest("QC session không thuộc planning thùng", "INVALID_QC_SESSION_TYPE");
                }
                //check inbound trước khi finalized
                isPaper
                    ? await exports.qcSampleService.assertHasInbound({ key: "planningId", id: session.planningId })
                    : await exports.qcSampleService.assertHasInbound({
                        key: "planningBoxId",
                        id: session.planningBoxId,
                    });
                await session.update({ status: "finalized" });
                //update status request in planning
                let planning = null;
                planning = isPaper
                    ? await planningPaper_1.PlanningPaper.findByPk(session.planningId, { transaction })
                    : await planningBox_1.PlanningBox.findByPk(session.planningBoxId, { transaction });
                if (!planning) {
                    throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
                }
                //update statusRequest
                if (planning instanceof planningPaper_1.PlanningPaper) {
                    await planning.update({ statusRequest: "finalize" }, { transaction });
                }
                else if (planning instanceof planningBox_1.PlanningBox) {
                    await planning.update({ statusRequest: "finalize" }, { transaction });
                }
                //update statusRequest planning
                if (!isPaper && planning instanceof planningBox_1.PlanningBox) {
                    await planningRepository_1.planningRepository.updateDataModel({
                        model: planningPaper_1.PlanningPaper,
                        data: { statusRequest: "finalize" },
                        options: { where: { planningId: planning.planningId }, transaction },
                    });
                }
                return { message: "finalize QC session successfully", data: session };
            });
        }
        catch (error) {
            console.error("create Qc Sample Result failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    assertHasInbound: async ({ key, id }) => {
        const inboundSums = await warehouseRepository_1.warehouseRepository.getInboundSumByPlanning(key, [id]);
        const totalInbound = inboundSums.length > 0 ? Number(inboundSums[0].totalInbound) || 0 : 0;
        if (totalInbound <= 0) {
            throw appError_1.AppError.BadRequest("Chưa có giá trị nhập kho, không thể hoàn thành phiên kiểm tra", "NO_INBOUND_HISTORY");
        }
    },
};
//# sourceMappingURL=qcSampleService.js.map