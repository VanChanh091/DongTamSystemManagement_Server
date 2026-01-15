import { Op } from "sequelize";
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
import { DeliveryItem } from "../models/delivery/deliveryItem";
import { Vehicle } from "../models/admin/vehicle";

export const deliveryRepository = {
  getPlanningEstimateTime: async (dayStart: Date) => {
    return await PlanningPaper.findAll({
      where: {
        dayStart: { [Op.lte]: dayStart },
        deliveryPlanned: false,
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

  getPlanningDelivery: async (deliveryDate: Date) => {
    return await DeliveryPlan.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: { deliveryDate: deliveryDate },
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
};
