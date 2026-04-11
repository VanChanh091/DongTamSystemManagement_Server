import { Op, Transaction } from "sequelize";
import { Box } from "../../models/order/box";
import { Order } from "../../models/order/order";
import { planningHelper } from "./planningHelper";
import { Product } from "../../models/product/product";
import { Customer } from "../../models/customer/customer";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { PlanningPaper, planningPaperStatus } from "../../models/planning/planningPaper";

export const planningStatusRepository = {
  //====================================PLANNING ORDER========================================
  getOrderAccept: async (type: string) => {
    const whereOrder: any = { status: "accept" };

    let isPlanningRequired = false;

    //lọc theo planned/unplanned
    if (type === "planned") {
      isPlanningRequired = true;
    } else if (type === "unplanned") {
      whereOrder["$PlanningPapers.planningId$"] = { [Op.is]: null };
      isPlanningRequired = false;
    }

    return await Order.findAll({
      where: whereOrder,
      attributes: {
        exclude: [
          "lengthPaperCustomer",
          "paperSizeCustomer",
          "quantityCustomer",
          "acreage",
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
        {
          model: PlanningPaper,
          attributes: ["planningId", "runningPlan", "qtyProduced"],
          required: isPlanningRequired,
        },
      ],
      order: [
        ["orderSortValue", "ASC"],
        ["dateRequestShipping", "ASC"],
      ],
      subQuery: false,
    });
  },

  findOrderById: async (orderId: string, transaction: Transaction) => {
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
      transaction,
    });
  },

  createPlanningBoxTime: async (machineTimes: any[], transaction: Transaction) => {
    return await PlanningBoxTime.bulkCreate(machineTimes, { validate: true, transaction });
  },

  //====================================PLANNING STOP========================================

  getStopByIds: async (planningIds: number[]) => {
    return PlanningPaper.findAll({
      where: { planningId: { [Op.in]: planningIds } },
      attributes: [
        "planningId",
        "dayCompleted",
        "dayStart",
        "timeRunning",
        "status",
        "sortPlanning",
      ],
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

    return planningHelper.updateDataModel({
      model: PlanningPaper,
      data,
      options: { where: { planningId: { [Op.in]: planningIds } } },
    });
  },
};
