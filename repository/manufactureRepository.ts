import { Op } from "sequelize";
import { Order } from "../models/order/order";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningBox } from "../models/planning/planningBox";

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
          attributes: { exclude: ["createdAt", "updatedAt", "status"] },
        },
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "canLan",
            "daoXa",
            "quantityManufacture",
            "dateRequestShipping",
            "instructSpecial",
            "isBox",
            "customerId",
            "productId",
          ],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
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
          "dayStart",
          "dayCompleted",
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
          where: { machine: { [Op.ne]: machine } },
          attributes: ["boxTimeId", "qtyProduced", "machine"],
        },
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          required: false,
          where: { machine: machine },
          attributes: { exclude: ["createdAt", "updatedAt", "status"] },
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
              attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
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
          ],
        },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  },

  getAllBoxTimeById: async (planningBoxId: number, transaction: any) => {
    return await PlanningBoxTime.findAll({
      where: { planningBoxId },
      transaction,
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
