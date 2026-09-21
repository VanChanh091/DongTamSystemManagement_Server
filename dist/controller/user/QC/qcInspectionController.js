"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkingInspection = exports.getQcInspectionErr = exports.getQcInspection = void 0;
const qcInspectionCheckService_1 = require("../../../service/qualityControl/qcInspectionCheckService");
//====================================INSPECTION PAPER========================================
const getQcInspection = async (req, res, next) => {
    const { page, pageSize, machine, field, keyword, startDate, endDate, isPaper } = req.query;
    try {
        const commonParams = {
            page: Number(page),
            pageSize: Number(pageSize),
            machine: machine,
        };
        // const hasSearch = !!(field && keyword);
        const serviceMap = {
            paper: {
                // search: () =>
                //   qcInspectionService.getInspectionPaperByField({
                //     ...commonParams,
                //     field,
                //     keyword,
                //     startDate,
                //     endDate,
                //   } as any),
                all: () => qcInspectionCheckService_1.qcInspectionService.getAllQcInspectionPaper(commonParams),
            },
            box: {
                // search: () =>
                //   qcInspectionService.getInspectionBoxByField({
                //     ...commonParams,
                //     field,
                //     keyword,
                //     startDate,
                //     endDate,
                //   } as any),
                all: () => qcInspectionCheckService_1.qcInspectionService.getAllQcInspectionBox(commonParams),
            },
        };
        const targetService = serviceMap[isPaper];
        if (!targetService) {
            return res.status(400).json({ message: "isPaper parameter must be 'paper' or 'box'" });
        }
        // const response = hasSearch ? await targetService.search() : await targetService.all();
        const response = await targetService.all();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getQcInspection = getQcInspection;
const getQcInspectionErr = async (req, res, next) => {
    const { planningId, planningBoxId, machine, isPaper } = req.query;
    try {
        let response;
        if (isPaper === "paper") {
            response = await qcInspectionCheckService_1.qcInspectionService.getInspectionPaperErr(Number(planningId));
        }
        else if (isPaper === "box") {
            response = await qcInspectionCheckService_1.qcInspectionService.getInspectionBoxErr(Number(planningBoxId), machine);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getQcInspectionErr = getQcInspectionErr;
//create
const checkingInspection = async (req, res, next) => {
    const { isPaper } = req.query;
    const { checking, errProgress, planningId, planningBoxId, machine, note } = req.body;
    try {
        let response;
        if (isPaper === "paper") {
            response = await qcInspectionCheckService_1.qcInspectionService.checkingInspectionPaper({
                req,
                machine,
                checking: checking,
                planningId: planningId,
                errProgress: errProgress,
                username: req.user.fullName,
                userId: req.user.userId,
                note: note,
            });
        }
        else if (isPaper === "box") {
            response = await qcInspectionCheckService_1.qcInspectionService.checkingInspectionBox({
                req,
                machine,
                planningBoxId: planningBoxId,
                errProgress: errProgress,
                username: req.user.fullName,
                userId: req.user.userId,
                note: note,
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.checkingInspection = checkingInspection;
//# sourceMappingURL=qcInspectionController.js.map