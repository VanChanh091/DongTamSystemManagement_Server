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
    return await PlanningPaper.findAll({
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
              "runningPlan",
              "day",
              "matE",
              "matB",
              "matC",
              "songE",
              "songB",
              "songC",
              "songE2",
              "length",
              "size",
              "hasOverFlow",
            ],
          },
          include: [
            {
              model: PlanningBoxTime,
              as: "boxTimes",
              where: whereCondition,
              attributes: { exclude: ["createdAt", "updatedAt"] },
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
      order: [["sortPlanning", "ASC"]],
      offset: offset,
      limit: pageSize,
    });
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
          where: {
            status: "complete",
            dayCompleted: { [Op.ne]: null },
          },
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
            exclude: ["rejectReason", "createdAt", "updatedAt"],
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
