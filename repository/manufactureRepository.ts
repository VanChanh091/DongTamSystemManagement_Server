import { Op } from "sequelize";
import { Order } from "../models/order/order";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningBox } from "../models/planning/planningBox";
import { InboundHistory } from "../models/warehouse/inboundHistory";

export const manufactureRepository = {
  //====================================PAPER========================================

  getManufacturePaper: async (machine: string) => {
    return await PlanningPaper.findAll({
      where: { chooseMachine: machine, dayStart: { [Op.ne]: null } },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt"] },
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
      order: [["sortPlanning", "ASC"]],
    });
  },

  getPapersById: async (planningId: number, transaction?: any) => {
    return await PlanningPaper.findOne({
      where: { planningId },
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
        { model: Order, attributes: ["quantityCustomer"] },
        { model: InboundHistory, attributes: ["inboundQty"] },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  },

  getPapersByOrderId: async (orderId: string, transaction?: any) => {
    return await PlanningPaper.findAll({
      where: { orderId: orderId },
      attributes: ["qtyProduced"],
      transaction,
    });
  },

  //====================================BOX========================================

  getManufactureBox: async (machine: string) => {
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
          where: { machine: machine, dayStart: { [Op.ne]: null } },
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
              "rpWasteLoss",
              "createdAt",
              "updatedAt",
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
      order: [[{ model: PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
    });
  },

  getBoxById: async (planningBoxId: number, machine: string, transaction?: any) => {
    return await PlanningBoxTime.findOne({
      where: { planningBoxId: planningBoxId, machine: machine },
      include: [
        {
          model: PlanningBox,
          include: [
            { model: timeOverflowPlanning, as: "timeOverFlow" },
            { model: Order, attributes: ["quantityCustomer"] },
            { model: InboundHistory, attributes: ["inboundQty"] },
          ],
        },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  },

  updatePlanningBoxTime: async (planningBoxId: number, machine: string, transaction?: any) => {
    return await PlanningBoxTime.update(
      { status: "planning" },
      {
        where: {
          machine,
          status: "producing",
          planningBoxId: { [Op.ne]: planningBoxId },
        },
        transaction,
      }
    );
  },
};
