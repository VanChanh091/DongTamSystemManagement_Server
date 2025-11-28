import { Op, Sequelize } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Order } from "../models/order/order";
import { PlanningPaper, planningPaperStatus } from "../models/planning/planningPaper";
import { Product } from "../models/product/product";
import { Box } from "../models/order/box";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { RepoPayload } from "../interface/types";

export const planningRepository = {
  //====================================FUNC GLOBAL========================================
  getModelById: async ({ model, where, options = {} }: RepoPayload) => {
    return await model.findOne({ where, ...options });
  },

  updateDataModel: async ({ model, data, options = {} }: RepoPayload) => {
    return await model.update(data, options);
  },

  deleteModelData: async ({ model, where, transaction }: RepoPayload) => {
    return await model.destroy({ where, transaction });
  },

  createPlanning: async ({ model, data, transaction }: RepoPayload) => {
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
  getPlanningPaperCount: async (whereCondition: any = {}) => {
    return await PlanningPaper.count({ where: whereCondition });
  },

  getPlanningPaper: async ({
    page = 1,
    pageSize = 20,
    whereCondition = {},
    paginate = false,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    paginate?: boolean;
  }) => {
    const query: any = {
      where: whereCondition,
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
          include: [{ model: Customer, attributes: ["customerName", "companyName"] }],
        },
      ],
    };

    if (paginate) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await PlanningPaper.findAll(query);
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

  getPapersById: async ({
    planningIds,
    options = {},
  }: {
    planningIds: number[];
    options?: { attributes?: any; include?: any };
  }) => {
    const { attributes, include } = options;

    return await PlanningPaper.findAll({
      attributes,
      include,
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

  getAllPlanningBox: async ({
    whereCondition = {},
    machine,
  }: {
    whereCondition?: any;
    machine: string;
  }) => {
    return await PlanningBox.findAll({
      where: whereCondition,
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
          where: { machine: { [Op.ne]: machine } },
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

  getPlanningBoxSearch: async (whereCondition: any = {}) => {
    return await PlanningBox.findAll({
      attributes: ["planningBoxId", "orderId", "planningId"],
      include: [
        {
          model: PlanningBoxTime,
          where: whereCondition,
          as: "boxTimes",
          attributes: ["machine", "status", "planningBoxId"],
        },
        {
          model: Order,
          attributes: ["QC_box"],
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
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

  getBoxsById: async ({
    planningBoxIds,
    machine,
    options = {},
  }: {
    planningBoxIds: number | number[];
    machine: string;
    options?: { attributes?: any; include?: any };
  }) => {
    const { attributes, include } = options;
    const ids = Array.isArray(planningBoxIds) ? planningBoxIds : [planningBoxIds];

    return await PlanningBoxTime.findAll({
      attributes,
      include,
      where: { planningBoxId: { [Op.in]: ids }, machine },
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

  //====================================PLANNING STOP========================================

  getStopByIds: async (planningIds: number[]) => {
    return PlanningPaper.findAll({
      attributes: [
        "planningId",
        "dayCompleted",
        "dayStart",
        "timeRunning",
        "status",
        "sortPlanning",
      ],
      where: { planningId: { [Op.in]: planningIds } },
    });
  },

  updateStatusPlanning: async ({
    planningIds,
    action,
  }: {
    planningIds: number[];
    action: planningPaperStatus;
  }) => {
    const data =
      action === "planning"
        ? {
            status: action,
            dayCompleted: null,
            dayStart: null,
            timeRunning: null,
            sortPlanning: null,
          }
        : { status: action };

    return planningRepository.updateDataModel({
      model: PlanningPaper,
      data,
      options: { where: { planningId: { [Op.in]: planningIds } } },
    });
  },
};
