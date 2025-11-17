import { Op, Sequelize } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Order } from "../models/order/order";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Product } from "../models/product/product";
import { Box } from "../models/order/box";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";

export const planningRepository = {
  //====================================FUNC GLOBAL========================================
  getModelById: async (model: any, where: any, options: any = {}) => {
    return await model.findOne({
      where,
      ...options,
    });
  },

  updateDataModel: async (model: any, data: any, options: any = {}) => {
    return await model.update(data, options);
  },

  deleteModelData: async (model: any, where: any, transaction?: any) => {
    return await model.destroy({ where, transaction });
  },

  createPlanning: async (model: any, data: any, transaction?: any) => {
    return await model.create(data, { transaction });
  },

  //====================================PLANNING ORDER========================================
  getOrderAccept: async () => {
    return await Order.findAll({
      where: { status: "accept" },
      attributes: {
        exclude: [
          "lengthPaperCustomer",
          "paperSizeCustomer",
          "quantityCustomer",
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
        ],
      },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product, attributes: ["typeProduct", "productName"] },
        // { model: Box, as: "box", attributes: ["boxId"] },
        { model: PlanningPaper, attributes: ["planningId", "runningPlan", "qtyProduced"] },
      ],
      order: [
        [Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
        ["dateRequestShipping", "ASC"],
      ],
    });
  },

  findOrderById: async (orderId: string) => {
    return await Order.findOne({
      where: { orderId },
      attributes: {
        exclude: [
          "lengthPaperCustomer",
          "paperSizeCustomer",
          "acreage",
          "dvt",
          "price",
          "pricePaper",
          "discount",
          "profit",
          "vat",
          "totalPriceVAT",
          "rejectReason",
          "createdAt",
          "updatedAt",
        ],
      },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product, attributes: ["typeProduct", "productName"] },
        { model: Box, as: "box" },
        { model: PlanningPaper, attributes: ["planningId", "runningPlan"] },
      ],
    });
  },

  createPlanningBoxTime: async (machineTimes: any[]) => {
    return await PlanningBoxTime.bulkCreate(machineTimes, { validate: true });
  },

  //====================================QUEUE PAPER========================================

  getPapersByMachine: async (machine: string) => {
    return await PlanningPaper.findAll({
      where: { chooseMachine: machine },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
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
              "quantityCustomer",
              "day",
              "matE",
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
              "numberChild",
              "lengthPaperManufacture",
              "paperSizeManufacture",
              "status",
            ],
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            {
              model: Box,
              as: "box",
              attributes: {
                exclude: ["createdAt", "updatedAt"],
              },
            },
          ],
        },
      ],
    });
  },

  getPapersByOrderId: async (orderId: string) => {
    return await PlanningPaper.findAll({
      where: {
        orderId: {
          [Op.like]: `%${orderId}%`,
        },
      },
      include: [
        {
          model: Order,
          attributes: {
            exclude: [
              "dayReceiveOrder",
              "acreage",
              "dvt",
              "price",
              "pricePaper",
              "discount",
              "profit",
              "totalPrice",
              "vat",
              "rejectReason",
              "createdAt",
              "updatedAt",
            ],
          },
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
            },
            {
              model: Box,
              as: "box",
              attributes: {
                exclude: ["createdAt", "updatedAt"],
              },
            },
          ],
        },
      ],
    });
  },

  getPapersByPlanningId: async (planningIds: number[]) => {
    return await PlanningPaper.findAll({
      where: {
        planningId: { [Op.in]: planningIds },
      },
    });
  },

  getBoxByPlanningId: async (paperId: number) => {
    return PlanningBox.findAll({
      where: { planningId: paperId },
    });
  },

  getPapersByUpdateIndex: async (updateIndex: any[], transaction?: any) => {
    return await PlanningPaper.findAll({
      where: { planningId: updateIndex.map((i) => i.planningId) },
      include: [{ model: Order }, { model: timeOverflowPlanning, as: "timeOverFlow" }],
      order: [["sortPlanning", "ASC"]],
      transaction,
    });
  },

  //====================================QUEUE BOX========================================

  getAllPlanningBox: async (machine: string) => {
    return await PlanningBox.findAll({
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
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          required: false,
          where: { machine: machine },
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "numberChild",
            "dateRequestShipping",
            "customerId",
            "productId",
            "quantityCustomer",
          ],
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
            },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
        },
      ],
    });
  },

  getBoxsByOrderId: async (orderId: string) => {
    return await PlanningBox.findAll({
      where: {
        orderId: {
          [Op.like]: `%${orderId}%`,
        },
      },
    });
  },

  getBoxsById: async (planningBoxIds: number[], machine: string) => {
    return await PlanningBoxTime.findAll({
      where: {
        planningBoxId: {
          [Op.in]: planningBoxIds,
        },
        machine,
      },
    });
  },

  getBoxesByUpdateIndex: async (updateIndex: any[], machine: string, transaction?: any) => {
    return await PlanningBox.findAll({
      where: { planningBoxId: updateIndex.map((i) => i.planningBoxId) },
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
        { model: PlanningBoxTime, as: "boxTimes", where: { machine } },
        {
          model: Order,
          include: [{ model: Box, as: "box", attributes: ["inMatTruoc", "inMatSau"] }],
        },
      ],
      order: [[{ model: PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
      transaction,
    });
  },

  getTimeOverflowPaper: async (machine: string, transaction?: any) => {
    return await timeOverflowPlanning.findOne({
      include: [
        {
          model: PlanningPaper,
          attributes: ["status", "ghepKho", "chooseMachine"],
          where: { chooseMachine: machine, status: "complete" },
          required: true,
        },
      ],
      order: [
        ["overflowDayStart", "DESC"],
        ["overflowTimeRunning", "DESC"],
      ],
      transaction,
    });
  },

  getTimeOverflowBox: async (machine: string, transaction?: any) => {
    return await timeOverflowPlanning.findOne({
      include: [
        {
          model: PlanningBox,
          include: [
            {
              model: PlanningBoxTime,
              as: "boxTimes",
              where: { machine, status: "complete" },
              attributes: ["status", "machine"],
              required: true,
            },
          ],
        },
      ],
      order: [
        ["overflowDayStart", "DESC"],
        ["overflowTimeRunning", "DESC"],
      ],
      transaction,
    });
  },
};
