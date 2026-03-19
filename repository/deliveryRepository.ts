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
import { DeliveryRequest, statusDelivery } from "../models/delivery/deliveryRequest";

export const deliveryRepository = {
  //================================PLANNING ESTIMATE TIME==================================
  getPlanningEstimateTime: async (dayStart: Date) => {
    return await PlanningPaper.findAll({
      where: {
        deliveryPlanned: { [Op.in]: ["none", "pending"] },
        dayStart: { [Op.lte]: dayStart },
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
            { model: Inventory, attributes: ["qtyInventory"] },
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

  getPaperDeliveryPlanned: async (planningId: number, transaction: Transaction) => {
    return await PlanningPaper.findOne({
      where: { planningId, deliveryPlanned: { [Op.in]: ["none", "pending"] } },
      include: [
        {
          model: Order,
          attributes: ["quantityCustomer", "lengthPaperCustomer", "paperSizeCustomer", "flute"],
        },
      ],
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
          attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box", "volume"],
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

  getDeliveryRequest: async () => {
    return await DeliveryRequest.findAll({
      where: { status: "requested" },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: PlanningPaper,
          attributes: ["planningId", "orderId", "lengthPaperPlanning", "sizePaperPLaning"],
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
        },
        { model: User, attributes: ["fullName"] },
      ],
    });
  },

  getDeliveryPlanByDate: async (deliveryDate: Date) => {
    return await DeliveryPlan.findOne({
      where: { deliveryDate },
      attributes: ["deliveryId", "deliveryDate"],
      include: [
        {
          model: DeliveryItem,
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: [
            {
              model: DeliveryRequest,
              attributes: ["requestId", "volume", "qtyRegistered"],
              include: [
                {
                  model: PlanningPaper,
                  attributes: ["planningId", "orderId", "lengthPaperPlanning", "sizePaperPLaning"],
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
                },
                { model: User, attributes: ["fullName"] },
              ],
            },
            { model: Vehicle, attributes: ["vehicleName", "licensePlate"] },
          ],
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

  // Trong delivery.repository.ts
  updateDeliveryRequestStatus: async (
    requestIds: number[],
    status: statusDelivery,
    transaction?: Transaction,
  ) => {
    return await DeliveryRequest.update(
      { status },
      {
        where: { requestId: requestIds },
        transaction,
      },
    );
  },

  bulkUpsert: async (item: any, transaction: Transaction) => {
    return await DeliveryItem.bulkCreate(item, {
      updateOnDuplicate: ["vehicleId", "sequence", "note", "status"],
      transaction,
    });
  },

  //=================================SCHEDULE DELIVERY=====================================

  getAllDeliveryPlanByDate: async (deliveryDate: Date, status?: string) => {
    const whereCondition: any = { deliveryDate: new Date(deliveryDate) };

    if (status) {
      whereCondition.status = status;
    }

    return await DeliveryPlan.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: whereCondition,
      include: [
        {
          model: DeliveryItem,
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: [
            {
              model: DeliveryRequest,
              attributes: { exclude: ["status", "userId", "planningId", "createdAt", "updatedAt"] },
              include: [
                {
                  model: PlanningPaper,
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
                        "lengthPaperCustomer",
                        "paperSizeCustomer",
                        "quantityCustomer",
                        "dvt",
                      ],
                      include: [
                        { model: Customer, attributes: ["customerName", "companyName"] },
                        { model: Product, attributes: ["typeProduct", "productName"] },
                        { model: Inventory, attributes: ["qtyInventory"] },
                      ],
                    },
                  ],
                },
              ],
            },
            { model: Vehicle, attributes: { exclude: ["createdAt", "updatedAt"] } },
          ],
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
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  },
};
