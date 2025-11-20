import { Op } from "sequelize";
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
  getPlanningPaperCount: async (whereCondition: any = {}) => {
    return await PlanningPaper.count({ where: whereCondition });
  },

  getAllPlaningPaper: async (whereCondition: any = {}, offset: number, pageSize: number) => {
    const rawPapers = await PlanningPaper.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        // {
        //   model: timeOverflowPlanning,
        //   as: "timeOverFlow",
        //   attributes: { exclude: ["createdAt", "updatedAt"] },
        // },
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
      offset: offset,
      limit: pageSize,
    });

    // ================================
    // 🔥 CHANGED: Format dữ liệu thành 2 tầng cho FE
    // ================================
    const formatted = rawPapers.map((paper) => {
      const box = paper.PlanningBox;

      // ===== Stages (7 công đoạn) =====
      // CHANGED: Làm gọn từng stage cho FE dễ render
      const stages = box?.boxTimes?.map((stage) => {
        const stageJson = stage.toJSON();
        return { ...stageJson };
      });

      // ===== Progress =====
      // CHANGED: Lấy qtyProduced cuối cùng trong chuỗi công đoạn
      // const lastStageProduced =
      //   stages?.filter((s) => s.qtyProduced != null).pop()?.qtyProduced ?? 0;

      // const progressBox =
      //   order.quantityManufacture > 0 ? lastStageProduced / order.quantityManufacture : 0;

      const paperJson: any = paper.toJSON();
      delete paperJson.PlanningBox;
      delete paperJson.Order.box;

      return {
        // ===== Level 1: Summary =====
        ...paperJson,

        // CHANGED: Level 2 — stages
        stages,
      };
    });

    return formatted;
  },

  getAllPlaningBox: async () => {
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
          as: "boxTimes",
          where: { status: "complete", dayCompleted: { [Op.ne]: null } },
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt"] },
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
            { model: Customer, attributes: ["customerName", "companyName"] },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
            {
              model: Product,
              attributes: ["typeProduct", "productName", "maKhuon"],
            },
            {
              model: User,
              attributes: ["fullName"],
            },
          ],
        },
      ],
      order: [["planningBoxId", "ASC"]],
    });
  },
};
