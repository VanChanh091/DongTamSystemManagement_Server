import { Op, Transaction } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningPaper } from "../models/planning/planningPaper";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";

export const reportRepository = {
  findReportPaperByMachine: async (machine: string, pageSize: number, offset: number) => {
    return await ReportPlanningPaper.findAndCountAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          where: { chooseMachine: machine },
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "dayCompleted",
              "shiftProduction",
              "shiftProduction",
              "shiftManagement",
              "status",
              "hasOverFlow",
              "sortPlanning",
            ],
          },
          include: [
            {
              model: Order,
              attributes: {
                exclude: [
                  "acreage",
                  "dvt",
                  "price",
                  "pricePaper",
                  "discount",
                  "profit",
                  "vat",
                  "rejectReason",
                  "createdAt",
                  "updatedAt",
                  "lengthPaperCustomer",
                  "paperSizeCustomer",
                  "quantityCustomer",
                  "day",
                  "matE",
                  "matB",
                  "matC",
                  "songE",
                  "songB",
                  "songC",
                  "songE2",
                  "lengthPaperManufacture",
                  "status",
                ],
              },
              include: [{ model: Customer, attributes: ["customerName", "companyName"] }],
            },
          ],
        },
      ],
      offset,
      limit: pageSize,
      order: [["dayReport", "DESC"]],
    });
  },

  findAllReportBox: async (machine: string, pageSize: number, offset: number) => {
    return await ReportPlanningBox.findAndCountAll({
      where: { machine: machine },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningBox,
          attributes: {
            exclude: [
              "hasIn",
              "hasBe",
              "hasXa",
              "hasDan",
              "hasCanLan",
              "hasCatKhe",
              "hasCanMang",
              "hasDongGhim",
              "createdAt",
              "updatedAt",
            ],
          },
          include: [
            {
              model: PlanningBoxTime,
              where: { machine: machine }, //tìm machine thỏa điều kiện
              as: "boxTimes",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: PlanningBoxTime,
              as: "allBoxTimes",
              where: {
                machine: { [Op.ne]: machine }, //lọc machine ra khỏi danh sách
              },
              attributes: {
                exclude: [
                  "timeRunning",
                  "dayStart",
                  "dayCompleted",
                  "wasteBox",
                  "shiftManagement",
                  "status",
                  "sortPlanning",
                  "createdAt",
                  "updatedAt",
                  "rpWasteLoss",
                ],
              },
            },
            {
              model: Order,
              attributes: {
                exclude: [
                  "acreage",
                  "dvt",
                  "price",
                  "pricePaper",
                  "discount",
                  "profit",
                  "vat",
                  "rejectReason",
                  "createdAt",
                  "updatedAt",
                  "lengthPaperCustomer",
                  "paperSizeCustomer",
                  "day",
                  "matE",
                  "matB",
                  "matC",
                  "songE",
                  "songB",
                  "songC",
                  "songE2",
                  "lengthPaperManufacture",
                  "status",
                ],
              },
              include: [
                { model: Customer, attributes: ["customerName", "companyName"] },
                {
                  model: Box,
                  as: "box",
                  attributes: { exclude: ["createdAt", "updatedAt"] },
                },
              ],
            },
          ],
        },
      ],
      offset,
      limit: pageSize,
      order: [["dayReport", "DESC"]],
    });
  },

  exportReportPaper: async (whereCondition: any = {}, machine: string) => {
    return await ReportPlanningPaper.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          where: { chooseMachine: machine },
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "dayCompleted",
              "shiftProduction",
              "shiftProduction",
              "shiftManagement",
              "status",
              "hasOverFlow",
              "sortPlanning",
            ],
          },
          include: [
            {
              model: Order,
              attributes: {
                exclude: [
                  "acreage",
                  "dvt",
                  "price",
                  "pricePaper",
                  "discount",
                  "profit",
                  "vat",
                  "rejectReason",
                  "createdAt",
                  "updatedAt",
                  "lengthPaperCustomer",
                  "paperSizeCustomer",
                  "quantityCustomer",
                  "day",
                  "matE",
                  "matB",
                  "matC",
                  "songE",
                  "songB",
                  "songC",
                  "songE2",
                  "lengthPaperManufacture",
                  "status",
                ],
              },
              include: [{ model: Customer, attributes: ["customerName", "companyName"] }],
            },
          ],
        },
      ],
      order: [["dayReport", "ASC"]],
    });
  },

  exportReportBox: async (whereCondition: any = {}, machine: string) => {
    return ReportPlanningBox.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningBox,
          attributes: {
            exclude: [
              "hasIn",
              "hasBe",
              "hasXa",
              "hasDan",
              "hasCanLan",
              "hasCatKhe",
              "hasCanMang",
              "hasDongGhim",
              "createdAt",
              "updatedAt",
            ],
          },
          include: [
            {
              model: PlanningBoxTime,
              where: { machine: machine },
              as: "boxTimes",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: PlanningBoxTime,
              as: "allBoxTimes",
              where: {
                machine: { [Op.ne]: machine },
              },
              attributes: {
                exclude: [
                  "timeRunning",
                  "dayStart",
                  "dayCompleted",
                  "wasteBox",
                  "shiftManagement",
                  "status",
                  "sortPlanning",
                  "createdAt",
                  "updatedAt",
                  "rpWasteLoss",
                ],
              },
            },
            {
              model: Order,
              attributes: {
                exclude: [
                  "acreage",
                  "dvt",
                  "price",
                  "pricePaper",
                  "discount",
                  "profit",
                  "vat",
                  "rejectReason",
                  "createdAt",
                  "updatedAt",
                  "lengthPaperCustomer",
                  "paperSizeCustomer",
                  "day",
                  "matE",
                  "matB",
                  "matC",
                  "songE",
                  "songB",
                  "songC",
                  "songE2",
                  "lengthPaperManufacture",
                  "status",
                ],
              },
              include: [
                { model: Customer, attributes: ["customerName", "companyName"] },
                {
                  model: Box,
                  as: "box",
                  attributes: { exclude: ["createdAt", "updatedAt"] },
                },
              ],
            },
          ],
        },
      ],
    });
  },

  //sync report paper or box for meili
  getDataReportPaperOrBox: async ({
    isBox,
    machine,
    whereCondition,
  }: {
    isBox: boolean;
    machine: string;
    whereCondition?: any;
  }) => {
    let data;

    if (isBox) {
      data = await ReportPlanningBox.findAll({
        where: whereCondition,
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: PlanningBox,
            attributes: {
              exclude: [
                "hasIn",
                "hasBe",
                "hasXa",
                "hasDan",
                "hasCanLan",
                "hasCatKhe",
                "hasCanMang",
                "hasDongGhim",
                "createdAt",
                "updatedAt",
              ],
            },
            include: [
              {
                model: PlanningBoxTime,
                where: { machine: machine },
                as: "boxTimes",
                attributes: { exclude: ["createdAt", "updatedAt"] },
              },
              {
                model: PlanningBoxTime,
                as: "allBoxTimes",
                where: {
                  machine: { [Op.ne]: machine },
                },
                attributes: {
                  exclude: [
                    "timeRunning",
                    "dayStart",
                    "dayCompleted",
                    "wasteBox",
                    "shiftManagement",
                    "status",
                    "sortPlanning",
                    "createdAt",
                    "updatedAt",
                    "rpWasteLoss",
                  ],
                },
              },
              {
                model: Order,
                attributes: {
                  exclude: [
                    "acreage",
                    "dvt",
                    "price",
                    "pricePaper",
                    "discount",
                    "profit",
                    "vat",
                    "rejectReason",
                    "createdAt",
                    "updatedAt",
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "day",
                    "matE",
                    "matB",
                    "matC",
                    "songE",
                    "songB",
                    "songC",
                    "songE2",
                    "lengthPaperManufacture",
                    "status",
                  ],
                },
                include: [
                  { model: Customer, attributes: ["customerName", "companyName"] },
                  {
                    model: Box,
                    as: "box",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                  },
                ],
              },
            ],
          },
        ],
      });
    } else {
      data = await ReportPlanningPaper.findAll({
        where: whereCondition,
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: PlanningPaper,
            where: { chooseMachine: machine },
            attributes: {
              exclude: [
                "createdAt",
                "updatedAt",
                "dayCompleted",
                "shiftProduction",
                "shiftProduction",
                "shiftManagement",
                "status",
                "hasOverFlow",
                "sortPlanning",
              ],
            },
            include: [
              {
                model: Order,
                attributes: {
                  exclude: [
                    "acreage",
                    "dvt",
                    "price",
                    "pricePaper",
                    "discount",
                    "profit",
                    "vat",
                    "rejectReason",
                    "createdAt",
                    "updatedAt",
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "quantityCustomer",
                    "day",
                    "matE",
                    "matB",
                    "matC",
                    "songE",
                    "songB",
                    "songC",
                    "songE2",
                    "lengthPaperManufacture",
                    "status",
                  ],
                },
                include: [
                  { model: Customer, attributes: ["customerName", "companyName"] },
                  {
                    model: Box,
                    as: "box",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    return data;
  },

  syncReportPaperForMeili: async (reportPaperId: number, transaction: Transaction) => {
    return await ReportPlanningPaper.findOne({
      where: { reportPaperId },
      attributes: ["reportPaperId", "dayReport", "shiftManagement"],
      include: [
        {
          model: PlanningPaper,
          attributes: ["chooseMachine"],
          include: [
            {
              model: Order,
              attributes: ["orderId"],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
      transaction,
    });
  },

  syncReportBoxesForMeili: async (reportBoxId: number, transaction: Transaction) => {
    return await ReportPlanningBox.findOne({
      where: { reportBoxId },
      attributes: ["reportBoxId", "dayReport", "shiftManagement", "machine"],
      include: [
        {
          model: PlanningBox,
          attributes: ["planningBoxId"],
          include: [
            {
              model: Order,
              attributes: ["orderId", "QC_box"],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
      transaction,
    });
  },
};
