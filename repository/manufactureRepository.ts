import { Op, Sequelize, Transaction } from "sequelize";
import { Order } from "../models/order/order";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningBox } from "../models/planning/planningBox";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { EmployeeBasicInfo } from "../models/employee/employeeBasicInfo";
import { EmployeeCompanyInfo } from "../models/employee/employeeCompanyInfo";

export const manufactureRepo = {
  //====================================HELPER=======================================
  getEmployeeByCode: async (reportedBy: string, transaction?: Transaction) => {
    return await EmployeeBasicInfo.findOne({
      attributes: ["fullName"],
      include: {
        model: EmployeeCompanyInfo,
        as: "companyInfo",
        where: { employeeCode: reportedBy },
        attributes: ["employeeCode"],
      },
      transaction,
    });
  },

  //====================================PAPER========================================

  getManufacturePaper: async (machine: string, filterType: string = "all") => {
    const whereCondition: any = {
      chooseMachine: machine,
      dayStart: { [Op.ne]: null },
      status: { [Op.in]: ["planning", "lackQty", "producing", "requested"] },
    };

    const operatorMap: Record<string, string> = {
      gtZero: ">",
      ltZero: "<=",
    };

    const operator = operatorMap[filterType];

    if (operator) {
      whereCondition[Op.and] = [
        Sequelize.where(
          Sequelize.col("runningPlan"),
          operator,
          Sequelize.fn("COALESCE", Sequelize.col("qtyProduced"), 0),
        ),
      ];
    }

    return await PlanningPaper.findAll({
      where: whereCondition,
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
            "chongTham",
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

  getPapersById: async (planningId: number, transaction?: Transaction) => {
    return await PlanningPaper.findOne({
      where: { planningId },
      include: [
        { model: timeOverflowPlanning, as: "timeOverFlow" },
        { model: Order, attributes: ["quantityCustomer", "quantityManufacture", "pricePaper"] },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  },

  getPapersByOrderId: async (orderId: string, transaction?: Transaction) => {
    return await PlanningPaper.findAll({
      where: { orderId: orderId },
      attributes: ["qtyProduced"],
      transaction,
    });
  },

  getReportPaperByPlanningId: async (planningId: number, transaction?: Transaction) => {
    return await ReportPlanningPaper.findOne({
      where: { planningId },
      order: [["createdAt", "DESC"]],
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  },

  getOldPlanningPaper: async (planningId: number, transaction?: Transaction) => {
    return await PlanningPaper.findByPk(planningId, {
      attributes: [
        "planningId",
        "chooseMachine",
        "runningPlan",
        "qtyProduced",
        "dayCompleted",
        "status",
        "hasBox",
        "orderId",
      ],
      include: [
        { model: Order, attributes: ["orderId", "quantityCustomer", "quantityManufacture"] },
      ],
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

  getReportBoxByPlanningBoxId: async (
    planningBoxId: number,
    machine: string,
    transaction?: Transaction,
  ) => {
    return await ReportPlanningBox.findOne({
      where: { planningBoxId, machine },
      order: [["createdAt", "DESC"]],
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  },

  //updateRequestStockCheck
  getBoxByPK: async (planningBoxId: number, machine: string, transaction: Transaction) => {
    return await PlanningBox.findByPk(planningBoxId, {
      include: [
        {
          model: PlanningBoxTime,
          where: { machine, dayStart: { [Op.ne]: null } },
          as: "boxTimes",
          attributes: ["boxTimeId", "qtyProduced", "machine", "isRequest"],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
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
      },
    );
  },
};
