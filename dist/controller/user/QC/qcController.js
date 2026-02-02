"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQC = exports.confirmFinalizeSession = exports.updateResult = exports.createNewResult = exports.getAllQcResult = exports.updateSession = exports.createNewSession = exports.getSessionByFk = exports.getAllQcSession = void 0;
const qcSessionService_1 = require("../../../service/qualityControl/qcSessionService");
const qcSampleService_1 = require("../../../service/qualityControl/qcSampleService");
const orchestratorService_1 = require("../../../service/qualityControl/orchestratorService");
//===============================QC SESSION=================================
//get all qc session
const getAllQcSession = async (req, res, next) => {
    try {
        const response = await qcSessionService_1.qcSessionService.getAllQcSession();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQcSession = getAllQcSession;
const getSessionByFk = async (req, res, next) => {
    const { planningId, planningBoxId } = req.query;
    try {
        const response = await qcSessionService_1.qcSessionService.getSessionByFk({
            planningId: planningId ? Number(planningId) : undefined,
            planningBoxId: planningBoxId ? Number(planningBoxId) : undefined,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getSessionByFk = getSessionByFk;
//create new qc session
const createNewSession = async (req, res, next) => {
    const { processType, planningId, planningBoxId, totalSample } = req.body;
    try {
        const response = await qcSessionService_1.qcSessionService.createNewSession({
            processType,
            planningId,
            planningBoxId,
            totalSample,
            user: req.user,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewSession = createNewSession;
//update qc session
const updateSession = async (req, res, next) => {
    const { qcSessionId, status, totalSample } = req.body;
    try {
        const response = await qcSessionService_1.qcSessionService.updateSession({
            qcSessionId,
            status,
            totalSample,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSession = updateSession;
//===============================QC SAMPLE=================================
//get all qc result
const getAllQcResult = async (req, res, next) => {
    const { qcSessionId } = req.query;
    try {
        const response = await qcSampleService_1.qcSampleService.getAllQcResult(Number(qcSessionId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQcResult = getAllQcResult;
//create new qc result
const createNewResult = async (req, res, next) => {
    const { qcSessionId, samples } = req.body;
    try {
        const response = await qcSampleService_1.qcSampleService.createNewResult({ qcSessionId, samples });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewResult = createNewResult;
//update qc result
const updateResult = async (req, res, next) => {
    const { qcSessionId, samples } = req.body;
    try {
        const response = await qcSampleService_1.qcSampleService.updateResult({ qcSessionId, samples });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateResult = updateResult;
// confirm Finalize Session
const confirmFinalizeSession = async (req, res, next) => {
    const { planningId, planningBoxId, isPaper = true, } = req.body;
    try {
        const response = await qcSampleService_1.qcSampleService.confirmFinalizeSession({
            planningId,
            planningBoxId,
            isPaper,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmFinalizeSession = confirmFinalizeSession;
//===============================QC RESULT=================================
const submitQC = async (req, res, next) => {
    try {
        const response = await orchestratorService_1.qcSubmitService.submitQC({
            ...req.body,
            user: req.user,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.submitQC = submitQC;
//# sourceMappingURL=qcController.js.map