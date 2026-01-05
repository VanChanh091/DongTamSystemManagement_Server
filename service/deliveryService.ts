import dotenv from "dotenv";
dotenv.config();

import { AppError } from "../utils/appError";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Op } from "sequelize";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Customer } from "../models/customer/customer";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { Inventory } from "../models/warehouse/inventory";
import { Order } from "../models/order/order";

const devEnvironment = process.env.NODE_ENV !== "production";

export const deliveryService = {
  getPlanningEstimateTime: async ({
    page = 1,
    pageSize = 20,
    dayStart,
    estimateTime,
  }: {
    page?: number;
    pageSize?: number;
    dayStart: Date;
    estimateTime: string;
  }) => {
    try {
      const [endHour, endMinute] = estimateTime.split(":").map(Number);

      if (
        isNaN(endHour) ||
        isNaN(endMinute) ||
        endHour < 0 ||
        endHour > 23 ||
        endMinute < 0 ||
        endMinute > 59
      ) {
        throw AppError.BadRequest("estimateTime không hợp lệ", "INVALID_ESTIMATE_TIME");
      }

      // mốc kết thúc NGÀY HÔM NAY
      const [estH, estM] = estimateTime.split(":").map(Number);
      const estimateMinutes = estH * 60 + estM;

      /* =========================
       * 2. GIẤY TẤM
       * ========================= */
      // where: {
      //           dayStart: { [Op.lte]: dayStart },
      //           [Op.or]: [
      //             { status: "complete" },
      //             {
      //               status: "planning",
      //               hasOverFlow: false,
      //               timeRunning: { [Op.lt]: estimateTime },
      //             },
      //           ],
      //         },

      const paperPlannings = await PlanningPaper.findAll({
        attributes: {
          exclude: [
            "createdAt",
            "updatedAt",
            "hasBox",
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
        where: { dayStart: { [Op.lte]: dayStart }, deliveryPlanned: false },
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
          [
            { model: Order, as: "Order" },
            { model: Customer, as: "Customer" },
            "customerName",
            "ASC",
          ],
        ],
        limit: 300,
      });

      // const filterValidPlanning = paperPlannings.filter((p) => {
      //   if (p.hasOverFlow) return false;

      //   return true;
      // });

      //filter

      const filtered = paperPlannings.filter((paper) => {
        // overflow là loại thẳng
        if (paper.hasOverFlow) return false; //DONE

        // complete luôn hiển thị
        if (paper.status === "complete") return true; //DONE

        // ===== planning =====

        // KHÔNG CÓ BOX → so paper
        if (!paper.hasBox) {
          if (!paper.timeRunning) return false;

          const [h, m, s = "0"] = paper.timeRunning.split(":");
          const paperMinutes = Number(h) * 60 + Number(m) + Number(s) / 60;

          // console.log(`time paper :${paperMinutes}`);
          // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);

          return paperMinutes <= estimateMinutes;
        }

        // CÓ BOX → so theo BOX
        const boxTimes = paper.PlanningBox?.boxTimes ?? []; //DONE

        // chưa chạy công đoạn nào → không cho hiển thị
        if (boxTimes.length === 0) return false; //DONE

        const latestBoxMinutes = Math.max(
          ...boxTimes.map((t: any) => {
            const [h, m, s = "0"] = t.timeRunning.split(":");

            return Number(h) * 60 + Number(m) + Number(s) / 60;
          })
        );

        // console.log(`latest time box: ${latestBoxMinutes}`);
        // console.log(`compare box: ${latestBoxMinutes <= estimateMinutes}`);

        return latestBoxMinutes <= estimateMinutes;
      });

      //PAGING DATA
      const totalPlannings = filtered.length;
      const totalPages = Math.ceil(totalPlannings / pageSize);

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const pageData = filtered.slice(startIndex, endIndex);

      //remove Planning box for UI
      const data = pageData.map((p: any) => {
        const plain = p.get({ plain: true });
        delete plain.PlanningBox;
        return plain;
      });

      const responseData = {
        message: "get all data paper from db",
        data,
        totalPlannings,
        totalPages,
        currentPage: page,
      };

      return responseData;
    } catch (error) {
      console.error("❌ get planning estimate time failed:", error);
      throw AppError.ServerError();
    }
  },

  confirmReadyDeliveryPlanning: async () => {
    try {
    } catch (error) {
      console.error("❌ confirm ready delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getPlanningDelivery: async () => {
    try {
    } catch (error) {
      console.error("❌ get planning delivery failed:", error);
      throw AppError.ServerError();
    }
  },

  confirmForDeliveryPlanning: async () => {
    try {
    } catch (error) {
      console.error("❌ confirm delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
