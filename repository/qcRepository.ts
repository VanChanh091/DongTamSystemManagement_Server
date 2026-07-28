import { FindOptions, Transaction } from "sequelize";
import { QcCriteria } from "../models/qualityControl/qcCriteria";
import { QcSampleResult } from "../models/qualityControl/qcSampleResult";
import { QcSession } from "../models/qualityControl/qcSession";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { QcInspectionBox } from "../models/qualityControl/qcInspection/qcInspectionBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningBox } from "../models/planning/planningBox";
import { Product } from "../models/product/product";
import { QcInspectionPaper } from "../models/qualityControl/qcInspection/qcInspectionPaper";

export const qcRepository = {
  //===============================CRITERIA=================================
  getAllQcCriteria: async (type: string) => {
    return await QcCriteria.findAll({
      where: { processType: type },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },

  findByPk: async (model: any, id: number, transaction: Transaction) => {
    return await model.findByPk(id, { transaction });
  },

  //===============================SESSION=================================

  getAllQcSession: async () => {
    return await QcSession.findAll({ order: [["createdAt", "DESC"]] });
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

  createNewSession: async (data: any, transaction: Transaction) => {
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

  getAllSample: async (qcSessionId: number, transaction: Transaction) => {
    return await QcSampleResult.findAll({
      where: { qcSessionId },
      attributes: ["hasFail"],
      transaction,
    });
  },

  getRequiredQcCriteria: async (processType: string, transaction: Transaction) => {
    return await QcCriteria.findAll({
      where: {
        processType: processType,
        isRequired: true,
      },
      attributes: ["criteriaCode"],
      transaction,
    });
  },

  //=========================INSPECTION PAPER & BOX============================
  buildInspectionPaperOptions: ({
    page,
    pageSize,
    machine,
    whereCondition,
  }: {
    page: number;
    pageSize: number;
    machine: string;
    whereCondition?: any;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          where: { chooseMachine: machine },
          attributes: [
            "orderId",
            "planningId",
            "lengthPaperPlanning",
            "sizePaperPLaning",
            "dayReplace",
            "matEReplace",
            "matBReplace",
            "matCReplace",
            "matE2Replace",
            "songEReplace",
            "songBReplace",
            "songCReplace",
            "songE2Replace",
            "chooseMachine",
            "runningPlan",
          ],
          required: true,
          include: [
            {
              model: Order,
              attributes: ["flute", "dayReceiveOrder"],
              include: [
                { model: Customer, attributes: ["customerName"] },
                { model: Product, attributes: ["productName"] },
              ],
            },
          ],
        },
      ],
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["inspecPaperId", "DESC"]];
    }

    return queryOptions;
  },

  buildInspectionBoxOptions: ({
    page,
    pageSize,
    machine,
    whereCondition,
  }: {
    page: number;
    pageSize: number;
    machine: string;
    whereCondition?: any;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningBoxTime,
          where: { machine },
          attributes: ["dayStart", "runningPlan", "machine"],
          include: [
            {
              model: PlanningBox,
              attributes: [
                "planningBoxId",
                "orderId",
                "length",
                "size",
                "day",
                "matE",
                "matB",
                "matC",
                "matE2",
                "songE",
                "songB",
                "songC",
                "songE2",
              ],
              include: [
                {
                  model: Order,
                  attributes: ["QC_box", "dayReceiveOrder"],
                  include: [
                    { model: Customer, attributes: ["customerName"] },
                    { model: Product, attributes: ["productName"] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["inspecBoxId", "DESC"]];
    }

    return queryOptions;
  },

  getChecklistInspectionPaper: async ({
    whereConditions,
    machine,
  }: {
    whereConditions: any;
    machine: string;
  }) => {
    return await QcInspectionPaper.findAll({
      attributes: ["checkList"],
      where: whereConditions,
      include: [
        {
          model: PlanningPaper,
          attributes: ["planningId", "chooseMachine"],
          where: { chooseMachine: machine },
        },
      ],
    });
  },

  getChecklistInspectionBox: async ({
    whereConditions,
    machine,
  }: {
    whereConditions: any;
    machine: string;
  }) => {
    return await QcInspectionBox.findAll({
      attributes: ["checkList"],
      where: whereConditions,
      include: [{ model: PlanningBoxTime, where: { machine }, attributes: [] }],
    });
  },
};
