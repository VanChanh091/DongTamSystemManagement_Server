import { Op } from "sequelize";
import { User } from "../models/user/user";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { Customer } from "../models/customer/customer";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Inventory } from "../models/warehouse/inventory/inventory";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";

export const syntheticRepository = {
  //====================================ORDERS========================================
  getAllOrderByStatus: async (status: string | string[], allOrders?: string) => {
    let statusFilter: string[];

    if (allOrders === "all") {
      // Nếu là "all", ép cứng lấy 2 trạng thái này
      statusFilter = ["planning", "complete"];
    } else {
      statusFilter = Array.isArray(status) ? status : [status];
    }

    const whereCondition = { status: { [Op.in]: statusFilter } };

    return await Order.findAndCountAll({
      where: whereCondition,
      attributes: [
        "orderId",
        "dayReceiveOrder",
        "lengthPaperCustomer",
        "lengthPaperManufacture",
        "paperSizeCustomer",
        "paperSizeManufacture",
        "quantityCustomer",
        "dvt",
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
        "instructSpecial",
        "status",
        "isBox",
      ],

      include: [
        { model: Customer, attributes: ["customerName"] },
        { model: Product, attributes: ["productName"] },
        { model: Inventory, attributes: ["totalQtyOutbound", "qtyInventory"] },
        { model: PlanningPaper, attributes: ["planningId", "qtyProduced", "qtyWasteNorm"] },
        { model: User, attributes: ["fullName"] },
      ],

      order: [
        // sort theo orderId
        ["orderSortValue", "ASC"],
        // sort theo accept -> planning | pending -> reject
        ["statusPriority", "DESC"],
      ],
    });
  },

  getPlanningBoxDetail: async (orderId: string) => {
    return await PlanningBox.findOne({
      where: { orderId: orderId },
      attributes: ["planningBoxId", "qtyPaper", "orderId"],
      include: [
        {
          model: PlanningBoxTime,
          as: "boxTimes",
          attributes: ["qtyProduced", "machine", "rpWasteLoss"],
        },
      ],
    });
  },

  //====================================PLANNING========================================
  getAllSyntheticPlanning: async ({
    page = 1,
    pageSize = 20,
    whereCondition = {},
    paginate = true,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    paginate?: boolean;
  }) => {
    const query: any = {
      where: whereCondition,
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "hasBox",
          "sortPlanning",
          "statusRequest",
          "hasOverFlow",
        ],
      },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "machine",
              "status",
              "planningId",
              "planningBoxId",
              "overflowId",
            ],
          },
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
            "dvt",
            "instructSpecial",
            "chongTham",
            "orderSortValue",
            "statusPriority",
            "isBox",
            "customerId",
            "productId",
          ],
          include: [
            { model: Customer, attributes: ["customerName"] },
            { model: Product, attributes: ["productName", "maKhuon"] },
            { model: Inventory, attributes: ["totalQtyOutbound"] },
          ],
        },
      ],
      order: [[{ model: Order }, "orderSortValue", "ASC"]],
    };

    if (paginate) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await PlanningPaper.findAndCountAll(query);
  },

  getSyntheticPlanningDetail: async (planningId: number) => {
    return await PlanningPaper.findByPk(planningId, {
      attributes: ["planningId", "orderId"],
      include: [
        {
          model: PlanningBox,
          attributes: ["planningBoxId", "qtyPaper", "hasOverFlow", "orderId", "planningId"],
          include: [
            {
              model: PlanningBoxTime,
              as: "boxTimes",
              attributes: {
                exclude: ["createdAt", "updatedAt", "boxTimeId", "status", "sortPlanning"],
              },
            },
          ],
        },
      ],
    });
  },

  getAllTimeOverflow: async (planningBoxId: number) => {
    return await timeOverflowPlanning.findAll({
      where: { planningBoxId: planningBoxId },
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "status",
          "planningId",
          "overflowId",
          "overflowDayStart",
        ],
      },
      raw: true,
    });
  },

  getSyntheticPlanningSearch: async (whereCondition: any = {}) => {
    return await PlanningPaper.findAll({
      where: whereCondition,
      attributes: ["planningId", "orderId", "chooseMachine", "ghepKho"],
      include: [
        {
          model: Order,
          attributes: ["flute"],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: User, attributes: ["fullName"] },
          ],
        },
      ],
    });
  },

  exportExcelSyntheticPlanning: async ({ whereCondition = {} }: { whereCondition?: any }) => {
    return await PlanningPaper.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: {
            exclude: [
              "createdAt",
              "updatedAt",
              "machine",
              "status",
              "planningId",
              "planningBoxId",
              "overflowId",
            ],
          },
        },
        {
          model: PlanningBox,
          attributes: ["planningBoxId", "qtyPaper", "hasOverFlow", "orderId", "planningId"],
          include: [
            {
              model: PlanningBoxTime,
              as: "boxTimes",
              attributes: {
                exclude: ["createdAt", "updatedAt", "boxTimeId", "status", "sortPlanning"],
              },
            },
            {
              model: timeOverflowPlanning,
              as: "timeOverFlow",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
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
            ],
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName", "maKhuon"] },
            { model: User, attributes: ["fullName"] },
          ],
        },
      ],
    });
  },
};
