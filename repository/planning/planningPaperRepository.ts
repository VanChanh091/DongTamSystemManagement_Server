import { Op, Transaction } from "sequelize";
import { Box } from "../../models/order/box";
import { Order } from "../../models/order/order";
import { Product } from "../../models/product/product";
import { Customer } from "../../models/customer/customer";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";

export const planningPaperRepository = {
  getPlanningPaper: async ({
    page = 1,
    pageSize = 20,
    whereCondition,
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

    return await PlanningPaper.findAndCountAll(query);
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

  syncPaperFromOrderToMeili: async (planningId: number, transaction: Transaction) => {
    return await PlanningPaper.findByPk(planningId, {
      attributes: ["planningId", "ghepKho", "orderId", "chooseMachine", "status"],
      include: [
        {
          model: Order,
          attributes: ["orderId"],
          include: [
            { model: Customer, attributes: ["customerName"] },
            { model: Product, attributes: ["productName"] },
          ],
        },
      ],
      transaction,
    });
  },
};
