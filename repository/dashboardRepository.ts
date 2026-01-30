import { Customer } from "../models/customer/customer";
import { Order } from "../models/order/order";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { Inventory } from "../models/warehouse/inventory";

export const dashboardRepository = {
  getDbPlanningCount: async () => {
    return await PlanningPaper.count();
  },

  getAllDbPlanning: async ({
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
            { model: Inventory, attributes: ["totalQtyOutbound"] },
          ],
        },
      ],
      order: [
        //sort theo orderId
        ["orderSortValue", "ASC"],
      ],
    };

    if (paginate) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    const rawPapers = await PlanningPaper.findAll(query);

    return rawPapers;
  },

  getDBPlanningDetail: async (planningId: number) => {
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

  getDbPlanningSearch: async (whereCondition: any = {}) => {
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

  exportExcelDbPlanning: async ({ whereCondition = {} }: { whereCondition?: any }) => {
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
