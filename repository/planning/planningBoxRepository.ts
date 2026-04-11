import { Op } from "sequelize";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { Box } from "../../models/order/box";

export const planningBoxRepository = {
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
          required: true,
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: PlanningBoxTime,
          as: "allBoxTimes",
          where: { machine: { [Op.ne]: machine } },
          required: false,
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
        {
          model: PlanningBoxTime,
          as: "boxTimes",
          where: { machine, sortPlanning: updateIndex.map((i) => i.sortPlanning) },
        },
        {
          model: Order,
          include: [{ model: Box, as: "box", attributes: ["inMatTruoc", "inMatSau"] }],
        },
      ],
      order: [[{ model: PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
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

  syncPlanningBoxToMeili: async ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: any;
  }) => {
    return await PlanningBox.findAll({
      where: whereCondition,
      attributes: ["planningBoxId"],
      include: [
        {
          model: PlanningBoxTime,
          as: "boxTimes",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Order,
          attributes: ["orderId", "QC_box"],
          include: [{ model: Customer, attributes: ["customerName"] }],
        },
      ],
      transaction,
    });
  },

  syncPlanningBoxByPlanningId: async (planningId: number, transaction: any) => {
    return await PlanningBox.findOne({
      where: { planningId },
      attributes: ["planningBoxId"],
      include: [
        {
          model: PlanningBoxTime,
          as: "boxTimes",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Order,
          attributes: ["orderId", "QC_box"],
          include: [{ model: Customer, attributes: ["customerName"] }],
        },
      ],
      transaction,
    });
  },
};
