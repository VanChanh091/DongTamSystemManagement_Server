import { FindOptions, Op, Sequelize, Transaction } from "sequelize";
import { Box } from "../../models/order/box";
import { Order } from "../../models/order/order";
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
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "dateRequestShipping",
            "flute",
            "QC_box",
            "canLan",
            "daoXa",
            "matE2",
            "quantityManufacture",
            "instructSpecial",
            "dvt",
            "isBox",
            "chongTham",
            "orderIdCustomer",
            "orderSortValue",
            "statusPriority",
            "customerId",
            "productId",
            "userId",
          ],
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

  planningPaperTotals: async (whereCondition?: any) => {
    const result = await PlanningPaper.findAll({
      where: { ...whereCondition, totalPrice: { [Op.gt]: 0 } },
      attributes: [[Sequelize.fn("SUM", Sequelize.col("totalPrice")), "totalPrice"]],
      raw: true,
    });

    return result[0];
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
    transaction,
  }: {
    planningIds: number[];
    options?: { attributes?: any; include?: any };
    transaction: Transaction;
  }) => {
    const { attributes, include } = options;

    return await PlanningPaper.findAll({
      where: { planningId: { [Op.in]: planningIds } },
      attributes,
      include,
      transaction,
    });
  },

  getBoxByPlanningId: async (paperId: number, transaction: Transaction) => {
    return PlanningBox.findAll({
      where: { planningId: paperId },
      transaction,
    });
  },

  getPapersByUpdateIndex: async (updateIndex: any[], transaction?: any) => {
    return await PlanningPaper.findAll({
      where: { planningId: updateIndex.map((i) => i.planningId) },
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "qtyProduced",
          "totalPrice",
          "bottom",
          "fluteE",
          "fluteB",
          "fluteC",
          "fluteE2",
          "knife",
          "totalLoss",
          "qtyWasteNorm",
          "shiftProduction",
          "shiftManagement",
          "note",
          "statusRequest",
          "deliveryPlanned",
          "hasBox",
        ],
      },
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

  getPaperToExportFile: async (machine: string) => {
    return PlanningPaper.findAll({
      where: {
        chooseMachine: machine,
        status: { [Op.notIn]: ["complete", "stop", "cancel"] },
        statusRequest: { [Op.in]: ["none", "requested"] },
        sortPlanning: { [Op.ne]: null },

        //qtyProduced < quantityManufacture
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("COALESCE", Sequelize.col("qtyProduced"), 0),
            "<",
            Sequelize.col("Order.quantityManufacture"),
          ),
        ],
      },
      attributes: [
        "planningId",
        "dayStart",
        "dayReplace",
        "matEReplace",
        "matBReplace",
        "matCReplace",
        "matE2Replace",
        "songEReplace",
        "songBReplace",
        "songCReplace",
        "songE2Replace",
        "lengthPaperPlanning",
        "sizePaperPLaning",
        "numberChild",
        "ghepKho",
        "qtyProduced",
        "runningPlan",
        "sortPlanning",
      ],
      include: [
        {
          model: Order,
          attributes: [
            "orderId",
            "flute",
            "dateRequestShipping",
            "quantityManufacture",
            "totalPrice",
            "instructSpecial",
          ],
          required: true,
          include: [{ model: Customer, attributes: ["customerName"] }],
        },
      ],
    });
  },

  //------------------------MEILISEARCH-----------------------------
  buildMeiliPlanningOptions: ({
    whereCondition = {},
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: ["planningId", "ghepKho", "chooseMachine", "status", "deliveryPlanned"],
      include: [
        {
          model: Order,
          attributes: ["orderId", "userId"],
          include: [{ model: Customer, attributes: ["customerName"] }],
        },
      ],
      transaction,
    };

    return queryOptions;
  },

  syncAllPaperToMeili: async ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }) => {
    return await PlanningPaper.findAll(
      planningPaperRepository.buildMeiliPlanningOptions({ whereCondition, transaction }),
    );
  },

  syncPaperFromOrderToMeili: async ({
    planningId,
    transaction,
  }: {
    planningId: number;
    transaction: Transaction;
  }) => {
    return await PlanningPaper.findOne(
      planningPaperRepository.buildMeiliPlanningOptions({
        whereCondition: { planningId, deliveryPlanned: { [Op.ne]: "delivered" } },
        transaction,
      }),
    );
  },
};
