"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcRepository = void 0;
const qcCriteria_1 = require("../models/qualityControl/qcCriteria");
const qcSampleResult_1 = require("../models/qualityControl/qcSampleResult");
const qcSession_1 = require("../models/qualityControl/qcSession");
const planningPaper_1 = require("../models/planning/planningPaper");
const order_1 = require("../models/order/order");
const customer_1 = require("../models/customer/customer");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const planningBox_1 = require("../models/planning/planningBox");
const product_1 = require("../models/product/product");
const qcInspectionPaper_1 = require("../models/qualityControl/inspection/qcInspectionPaper");
const qcInspectionBox_1 = require("../models/qualityControl/inspection/qcInspectionBox");
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
        return await qcSession_1.QcSession.findAll({ order: [["createdAt", "DESC"]] });
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
    //========================INSPECTION PAPER============================
    buildInspectionPaperOptions: ({ page, pageSize, machine, whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    ...(machine ? { where: { chooseMachine: machine } } : {}),
                    attributes: [
                        "orderId",
                        "planningId",
                        "lengthPaperPlanning",
                        "sizePaperPLaning",
                        "dayReplace",
                        "matEReplace",
                        "matBReplace",
                        "matCReplace",
                        "matAReplace",
                        "matE2Replace",
                        "songEReplace",
                        "songBReplace",
                        "songCReplace",
                        "songAReplace",
                        "songE2Replace",
                        "chooseMachine",
                        "runningPlan",
                    ],
                    required: true,
                    include: [
                        {
                            model: order_1.Order,
                            attributes: ["flute", "dayReceiveOrder", "isFSC"],
                            include: [
                                { model: customer_1.Customer, attributes: ["customerName"] },
                                { model: product_1.Product, attributes: ["productName"] },
                            ],
                        },
                    ],
                },
            ],
            transaction,
        };
        if (page && pageSize) {
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
            queryOptions.order = [["inspecPaperId", "DESC"]];
        }
        return queryOptions;
    },
    syncInspecPaperForMeili: async (inspecPaperId, transaction) => {
        return await qcInspectionPaper_1.QcInspectionPaper.findOne(exports.qcRepository.buildInspectionPaperOptions({
            whereCondition: { inspecPaperId },
            transaction,
        }));
    },
    syncAllInspecPaperForMeili: async () => {
        return await qcInspectionPaper_1.QcInspectionPaper.findAll(exports.qcRepository.buildInspectionPaperOptions({}));
    },
    getChecklistInspectionPaper: async ({ whereConditions, machine, }) => {
        return await qcInspectionPaper_1.QcInspectionPaper.findAll({
            attributes: ["checkList"],
            where: whereConditions,
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["planningId", "chooseMachine"],
                    where: { chooseMachine: machine },
                },
            ],
        });
    },
    //=========================INSPECTION BOX============================
    buildInspectionBoxOptions: ({ page, pageSize, machine, whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    ...(machine ? { where: { machine } } : {}),
                    attributes: ["dayStart", "runningPlan", "machine"],
                    include: [
                        {
                            model: planningBox_1.PlanningBox,
                            attributes: [
                                "planningBoxId",
                                "orderId",
                                "length",
                                "size",
                                "day",
                                "matE",
                                "matB",
                                "matC",
                                "matA",
                                "matE2",
                                "songE",
                                "songB",
                                "songC",
                                "songA",
                                "songE2",
                            ],
                            include: [
                                {
                                    model: order_1.Order,
                                    attributes: ["QC_box", "dayReceiveOrder", "isFSC"],
                                    include: [
                                        { model: customer_1.Customer, attributes: ["customerName"] },
                                        { model: product_1.Product, attributes: ["productName"] },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            transaction,
        };
        if (page && pageSize) {
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
            queryOptions.order = [["inspecBoxId", "DESC"]];
        }
        return queryOptions;
    },
    getChecklistInspectionBox: async ({ whereConditions, machine, }) => {
        return await qcInspectionBox_1.QcInspectionBox.findAll({
            attributes: ["checkList"],
            where: whereConditions,
            include: [{ model: planningBoxMachineTime_1.PlanningBoxTime, where: { machine }, attributes: [] }],
        });
    },
    syncInspecBoxForMeili: async (inspecBoxId, transaction) => {
        return await qcInspectionBox_1.QcInspectionBox.findAll(exports.qcRepository.buildInspectionBoxOptions({ whereCondition: { inspecBoxId }, transaction }));
    },
    syncAllInspecBoxForMeili: async () => {
        return await qcInspectionBox_1.QcInspectionBox.findAll(exports.qcRepository.buildInspectionBoxOptions({}));
    },
};
//# sourceMappingURL=qcRepository.js.map