import { Op, Transaction } from "sequelize";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { Inventory } from "../models/warehouse/inventory";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { DeliveryPlan } from "../models/delivery/deliveryPlan";
import { DeliveryItem, statusDeliveryItem } from "../models/delivery/deliveryItem";
import { Vehicle } from "../models/admin/vehicle";
import { FluteRatio } from "../models/admin/fluteRatio";

export const deliveryRepository = {
  //================================PLANNING ESTIMATE TIME==================================
  getPlanningEstimateTime: async (dayStart: Date) => {
    return await PlanningPaper.findAll({
      where: {
        dayStart: { [Op.lte]: dayStart },
        deliveryPlanned: "none",
        status: { [Op.notIn]: ["stop", "cancel"] },
      },
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "sortPlanning",
          "statusRequest",
          "hasOverFlow",
          "bottom",
          "fluteE",
          "fluteB",
          "fluteC",
          "fluteE2",
          "knife",
          "totalLoss",
          "qtyWasteNorm",
          "chooseMachine",
          "shiftProduction",
          "shiftManagement",
        ],
      },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: ["overflowDayStart", "overflowTimeRunning", "status"],
        },
        {
          model: Order,
          attributes: {
            exclude: [
              "rejectReason",
              "createdAt",
              "updatedAt",
              "day",
              "matE",
              "matE2",
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
              "status",
              "lengthPaperCustomer",
              "paperSizeCustomer",
              "quantityCustomer",
              "lengthPaperManufacture",
              "paperSizeManufacture",
              "numberChild",
              "isBox",
              "canLan",
              "daoXa",
              "acreage",
              "pricePaper",
              "profit",
            ],
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
            { model: User, attributes: ["fullName"] },
            { model: Inventory, attributes: ["totalQtyOutbound"] },
          ],
        },
        {
          model: PlanningBox,
          required: false,
          attributes: ["planningBoxId"],
          include: [
            {
              model: timeOverflowPlanning,
              as: "timeOverFlow",
              attributes: ["overflowDayStart", "overflowTimeRunning", "status"],
            },
            {
              model: PlanningBoxTime,
              as: "boxTimes",
              attributes: [
                "runningPlan",
                "timeRunning",
                "dayStart",
                "qtyProduced",
                "machine",
                "status",
              ],
              required: false,
              where: {
                dayStart: { [Op.lte]: dayStart },
                timeRunning: { [Op.ne]: null },
              },
            },
          ],
        },
      ],
      order: [
        [{ model: Order, as: "Order" }, { model: Customer, as: "Customer" }, "customerName", "ASC"],
      ],
      limit: 300,
    });
  },

  getPaperDeliveryPlanned: async (planningIds: number[], transaction: Transaction) => {
    return await PlanningPaper.findAll({
      where: {
        planningId: planningIds,
        deliveryPlanned: "none",
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  },

  //=================================PLANNING DELIVERY=====================================

  getPlanningPendingDelivery: async () => {
    return await PlanningPaper.findAll({
      where: { deliveryPlanned: "pending" },
      attributes: [
        "planningId",
        "lengthPaperPlanning",
        "sizePaperPLaning",
        "hasBox",
        "deliveryPlanned",
        "orderId",
      ],
      include: [
        {
          model: Order,
          attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box"],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
          ],
        },
        {
          model: PlanningBox,
          required: false,
          attributes: ["planningBoxId"],
        },
      ],
    });
  },

  findOneFluteRatio: async (flute: string) => {
    return await FluteRatio.findOne({ where: { fluteName: flute }, attributes: ["ratio"] });
  },

  findAllFluteRatio: async () => {
    return await FluteRatio.findAll({ attributes: ["fluteName", "ratio"], raw: true });
  },

  getDeliveryPlanByDate: async (deliveryDate: Date) => {
    return await DeliveryPlan.findOne({
      where: { deliveryDate },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: DeliveryItem,
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: [{ model: Vehicle, attributes: ["vehicleName", "licensePlate"] }],
        },
      ],
      order: [["deliveryId", "ASC"]],
    });
  },

  findOneDeliveryPlanByDate: async (deliveryDate: Date, transaction: Transaction) => {
    return await DeliveryPlan.findOne({
      where: { deliveryDate: new Date(deliveryDate) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  },

  getAllBoxByIds: async (boxIds: number[], isRaw: boolean) => {
    return await PlanningBox.findAll({
      where: { planningBoxId: { [Op.in]: boxIds } },
      attributes: ["planningBoxId", "planningId"],
      raw: isRaw,
    });
  },

  getAllPaperByIds: async (allPlanningIds: number[]) => {
    return PlanningPaper.findAll({
      where: { planningId: { [Op.in]: allPlanningIds } },
      attributes: [
        "planningId",
        "lengthPaperPlanning",
        "sizePaperPLaning",
        "deliveryPlanned",
        "orderId",
      ],
      include: [
        {
          model: Order,
          attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box"],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
          ],
        },
      ],
      nest: true,
      raw: true,
    });
  },

  getAllPaperScheduled: async (allPlanningIds: number[]) => {
    return await PlanningPaper.findAll({
      where: { planningId: { [Op.in]: allPlanningIds } },
      attributes: ["planningId"],
      include: [
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "day",
            "matE",
            "matB",
            "matC",
            "matE2",
            "songE",
            "songB",
            "songC",
            "songE2",
            "lengthPaperManufacture",
            "paperSizeManufacture",
            "quantityManufacture",
            "dvt",
          ],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
            { model: Inventory, attributes: ["qtyInventory"] },
          ],
        },
      ],
      raw: true,
      nest: true,
    });
  },

  findOrCreateDeliveryPlan: async (deliveryDate: Date, transaction: Transaction) => {
    return await DeliveryPlan.findOrCreate({
      where: { deliveryDate: new Date(deliveryDate) },
      include: [{ model: DeliveryItem }],
      transaction,
    });
  },

  destroyItemById: async (itemIds: number[], transaction: Transaction) => {
    return await DeliveryItem.destroy({
      where: { deliveryItemId: { [Op.in]: itemIds } },
      transaction,
    });
  },

  updatePlanningPaperById: async ({
    planningIds,
    status,
    transaction,
  }: {
    planningIds: number[];
    status: "pending" | "planned";
    transaction: Transaction;
  }) => {
    return await PlanningPaper.update(
      { deliveryPlanned: status },
      { where: { planningId: { [Op.in]: planningIds } }, transaction },
    );
  },

  updateDeliveryItemById: async ({
    statusUpdate,
    whereCondition,
    transaction,
  }: {
    statusUpdate: statusDeliveryItem;
    whereCondition: any;
    transaction: Transaction;
  }) => {
    return await DeliveryItem.update(
      { status: statusUpdate },
      { where: whereCondition, transaction },
    );
  },

  bulkUpsert: async (item: any, transaction: Transaction) => {
    return await DeliveryItem.bulkCreate(item, {
      updateOnDuplicate: ["vehicleId", "sequence", "note", "status"],
      transaction,
    });
  },

  //=================================SCHEDULE DELIVERY=====================================

  getAllDeliveryPlanByDate: async (deliveryDate: Date) => {
    return await DeliveryPlan.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: { deliveryDate: new Date(deliveryDate) },
      include: [
        {
          model: DeliveryItem,
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: [{ model: Vehicle, attributes: { exclude: ["createdAt", "updatedAt"] } }],
        },
      ],
    });
  },

  deliveryCount: async (deliveryId: number, transaction: Transaction) => {
    return await DeliveryItem.count({
      where: {
        deliveryId,
        status: { [Op.notIn]: ["completed", "cancelled"] },
      },
      transaction,
    });
  },

  getDeliveryItemByIds: async (itemIds: number[], transaction: Transaction) => {
    return await DeliveryItem.findAll({
      where: { deliveryItemId: itemIds },
      attributes: ["targetType", "targetId"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  },
};
