import { FindOptions, Op, Transaction } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningPaper } from "../models/planning/planningPaper";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";

export const reportRepository = {
  buildReportPaperOptions: ({
    machine,
    page,
    pageSize,
    whereCondition,
    isExport = false,
  }: {
    machine?: string;
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    isExport?: boolean;
  }): FindOptions => {
    const reportPaperWhere: any = {};
    if (machine) {
      reportPaperWhere.chooseMachine = machine;
    }

    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          where: reportPaperWhere,
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "dayCompleted",
              "shiftProduction",
              "shiftManagement",
              "status",
              "hasOverFlow",
              "sortPlanning",
              "totalPrice",
              "qtyWasteNorm",
              "note",
              "statusRequest",
              "deliveryPlanned",
            ],
          },
          include: [
            {
              model: Order,
              attributes: [
                "orderId",
                "dayReceiveOrder",
                "dateRequestShipping",
                "flute",
                "canLan",
                "daoXa",
                "dvt",
                "instructSpecial",
              ],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["dayReport", "DESC"]];
    }

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
  },

  buildReportBoxOptions: ({
    machine,
    page,
    pageSize,
    whereCondition,
    isExport = false,
  }: {
    machine?: string;
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    isExport?: boolean;
  }): FindOptions => {
    const boxTimesWhere: any = {};
    const allBoxTimesWhere: any = {};

    if (machine && machine.trim() !== "") {
      boxTimesWhere.machine = machine;
      allBoxTimesWhere.machine = { [Op.ne]: machine };
    } else {
      // Nếu KHÔNG truyền máy (Xuất tất cả):
      // boxTimesWhere để trống để lấy tất cả các máy.
      // allBoxTimesWhere đặt một giá trị không tồn tại để trả về mảng rỗng [],
      allBoxTimesWhere.machine = "__ALL_MACHINES_SELECTED__";
    }

    const queryOptions: FindOptions = {
      where: whereCondition, //machine: machine
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
              where: boxTimesWhere, //tìm machine thỏa điều kiện
              as: "boxTimes",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: PlanningBoxTime,
              as: "allBoxTimes",
              where: allBoxTimesWhere,
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
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["dayReport", "DESC"]];
    }

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
  },

  getReportPaperByIds: async (planningIds: number[], transaction?: Transaction) => {
    return await ReportPlanningPaper.findAll({
      where: { planningId: { [Op.in]: planningIds } },
      attributes: [
        "reportPaperId",
        "planningId",
        "qtyWasteNorm",
        "shiftProduction",
        "shiftManagement",
      ],
      transaction,
    });
  },

  //------------------------MEILISEARCH-----------------------------
  buildMeiliReportPaperOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
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
    };

    return queryOptions;
  },

  syncReportPaperForMeili: async (reportPaperId: number, transaction: Transaction) => {
    return await ReportPlanningPaper.findOne(
      reportRepository.buildMeiliReportPaperOptions({
        whereCondition: { reportPaperId },
        transaction,
      }),
    );
  },

  syncAllReportPapersForMeili: async () => {
    return await ReportPlanningPaper.findAll(reportRepository.buildMeiliReportPaperOptions({}));
  },

  buildMeiliReportBoxOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
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
    };

    return queryOptions;
  },

  syncReportBoxesForMeili: async (reportBoxId: number, transaction: Transaction) => {
    return await ReportPlanningBox.findOne(
      reportRepository.buildMeiliReportBoxOptions({
        whereCondition: { reportBoxId },
        transaction,
      }),
    );
  },

  syncAllReportBoxesForMeili: async () => {
    return await ReportPlanningBox.findAll(reportRepository.buildMeiliReportBoxOptions({}));
  },
};
