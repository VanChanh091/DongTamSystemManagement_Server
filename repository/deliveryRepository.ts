import { User } from "../models/user/user";
import { Op, Transaction } from "sequelize";
import { Order } from "../models/order/order";
import { Vehicle } from "../models/admin/vehicle";
import { Product } from "../models/product/product";
import { Customer } from "../models/customer/customer";
import { PlanningBox } from "../models/planning/planningBox";
import { DeliveryPlan } from "../models/delivery/deliveryPlan";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Inventory } from "../models/warehouse/inventory/inventory";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { DeliveryItem, statusDeliveryItem } from "../models/delivery/deliveryItem";
import { DeliveryRequest, statusDelivery } from "../models/delivery/deliveryRequest";

export const deliveryRepository = {
  //================================PLANNING ESTIMATE TIME==================================
  getPlanningEstimateTime: async (dayStart: Date, userId: number, all: string) => {
    return await PlanningPaper.findAll({
      where: {
        dayStart: { [Op.lte]: dayStart },
        status: { [Op.notIn]: ["stop", "cancel"] },
        deliveryPlanned: { [Op.in]: ["none", "pending"] },
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
        "qtyProduced",
        "hasBox",
        "timeRunning",
        "orderId",
        "status",
      ],
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: ["overflowDayStart", "overflowTimeRunning", "status"],
        },
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "dateRequestShipping",
            "QC_box",
            "paperSizeManufacture",
            "lengthPaperManufacture",
            "quantityManufacture",
            "dvt",
            "isBox",
            "volume",
            "instructSpecial",
            "customerId",
            "productId",
            "userId",
          ],
          include: [
            { model: Customer, attributes: ["customerName"] },
            { model: Product, attributes: ["productName"] },
            { model: User, where: all === "true" ? {} : { userId }, attributes: ["fullName"] },
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
      limit: 1000,
    });
  },

  getPaperWaitingRegister: async (planningId: number, transaction: Transaction) => {
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

  getPaperWaitingClose: async (planningId: number | number[], transaction: Transaction) => {
    return await PlanningPaper.findAll({
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

  getAllDeliveryPlanByDate: async ({
    deliveryDate,
    status,
    itemStatus,
  }: {
    deliveryDate: Date;
    status?: string;
    itemStatus?: string;
  }) => {
    const whereCondition: any = { deliveryDate: new Date(deliveryDate) };

    if (status) {
      whereCondition.status = status;
    }

    const itemWhereCondition: any = {};
    if (itemStatus) {
      itemWhereCondition.status = itemStatus;
    }

    return await DeliveryPlan.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: whereCondition,
      include: [
        {
          model: DeliveryItem,
          where: Object.keys(itemWhereCondition).length > 0 ? itemWhereCondition : undefined,
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: [
            {
              model: DeliveryRequest,
              attributes: { exclude: ["status", "userId", "planningId", "createdAt", "updatedAt"] },
              include: [
                {
                  model: PlanningPaper,
                  attributes: ["planningId", "hasBox"],
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
                        "dvt",
                      ],
                      include: [
                        { model: Customer, attributes: ["customerName", "companyName"] },
                        { model: Product, attributes: ["productName"] },
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

  getDeliveryItemToUpdateStatus: async (
    itemIds: number[],
    deliveryId: number,
    transaction: Transaction,
  ) => {
    return await DeliveryItem.findAll({
      where: { deliveryItemId: { [Op.in]: itemIds }, deliveryId },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: DeliveryRequest,
          attributes: ["requestId"],
          include: [
            {
              model: PlanningPaper,
              attributes: ["planningId", "hasBox", "orderId"],
              include: [{ model: PlanningBox, attributes: ["planningBoxId"] }],
            },
          ],
        },
      ],
      transaction,
    });
  },
};
