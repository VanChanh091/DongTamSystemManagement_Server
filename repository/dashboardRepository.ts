import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";

export const dashboardRepository = {
  getDbPlanningCount: async () => {
    return await PlanningPaper.count();
  },

  getAllDbPlanning: async ({
    whereCondition = {},
    offset,
    pageSize,
    paginate = true,
  }: {
    whereCondition?: any;
    offset?: number;
    pageSize?: number;
    paginate?: boolean;
  }) => {
    const query: any = {
      where: whereCondition,
      attributes: {
        exclude: ["createdAt", "updatedAt", "status", "hasBox", "sortPlanning"],
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
          ],
        },
      ],
      // order: [["sortPlanning", "ASC"]],
    };

    if (paginate) {
      query.offset = offset;
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
      // order: [["sortPlanning", "ASC"]],
    });
  },

  getAllTimeOverflow: async (planningBoxId: number) => {
    return await timeOverflowPlanning.findAll({
      where: { planningBoxId: planningBoxId },
      attributes: {
        exclude: ["createdAt", "updatedAt", "status", "planningId", "overflowId"],
      },
      raw: true,
    });
  },

  exportExcelDbPlanning: async ({
    whereCondition = {},
    offset,
    pageSize,
  }: {
    whereCondition?: any;
    offset?: number;
    pageSize?: number;
  }) => {
    const query: any = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt"] },
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
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
              "status",
            ],
          },
          include: [
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName", "maKhuon"] },
            { model: User, attributes: ["fullName"] },
          ],
        },
      ],
      order: [["sortPlanning", "ASC"]],
    };

    if (paginate) {
      query.offset = offset;
      query.limit = pageSize;
    }

    const rawPapers = await PlanningPaper.findAll(query);

    // Format dữ liệu thành 2 tầng cho FE
    const formatted = rawPapers.map((paper) => {
      const box = paper.PlanningBox;

      // ===== Stages (7 công đoạn) =====
      const stages = box?.boxTimes?.map((stage) => {
        const stageJson = stage.toJSON();
        return { ...stageJson };
      });

      const paperJson: any = paper.toJSON();
      delete paperJson.PlanningBox;
      delete paperJson.Order.box;

      return {
        // ===== Level 1: Summary =====
        ...paperJson,

        // ===== Level 2 — stages =====
        stages,
      };
    });

    return formatted;
  },
};
