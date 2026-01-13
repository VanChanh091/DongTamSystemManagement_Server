import dotenv from "dotenv";
dotenv.config();

import { AppError } from "../utils/appError";
import { deliveryRepository } from "../repository/deliveryRepository";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { PlanningPaper } from "../models/planning/planningPaper";
import { DeliveryItem, statusDeliveryItem, targetType } from "../models/delivery/deliveryItem";
import { DeliveryPlan } from "../models/delivery/deliveryPlan";
import { PlanningBox } from "../models/planning/planningBox";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { Product } from "../models/product/product";

const devEnvironment = process.env.NODE_ENV !== "production";

export const deliveryService = {
  //================================PLANNING ESTIMATE TIME==================================
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

      const paperPlannings = await deliveryRepository.getPlanningEstimateTime(dayStart);

      //filter
      const filtered = paperPlannings.filter((paper) => {
        if (paper.hasOverFlow) return false;

        if (paper.status === "complete") return true;

        // KHÔNG CÓ BOX → so paper
        if (!paper.hasBox) {
          if (!paper.timeRunning) return false;

          const [h, m, s = "0"] = paper.timeRunning.split(":");
          const paperMinutes = Number(h) * 60 + Number(m) + Number(s) / 60;

          // console.log(`time paper: ${paperMinutes}`);
          // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);

          return paperMinutes <= estimateMinutes;
        }

        // CÓ BOX → so theo BOX
        const boxTimes = paper.PlanningBox?.boxTimes ?? [];

        if (boxTimes.length === 0) return false;

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

  confirmReadyDeliveryPlanning: async ({ planningIds }: { planningIds: number[] }) => {
    try {
      if (!planningIds || planningIds.length === 0) {
        throw AppError.BadRequest("Danh sách planning rỗng", "EMPTY_PLANNING_LIST");
      }

      return await runInTransaction(async (transaction) => {
        const plannings = await PlanningPaper.findAll({
          where: {
            planningId: planningIds,
            deliveryPlanned: false,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (plannings.length !== planningIds.length) {
          throw AppError.BadRequest(
            "Một số planning không tồn tại hoặc đã được xác nhận",
            "INVALID_PLANNING_IDS"
          );
        }

        for (const planning of plannings) {
          if (planning.hasOverFlow) {
            throw AppError.BadRequest(
              `Planning ${planning.planningId} bị overflow`,
              "PLANNING_OVERFLOW"
            );
          }

          await planning.update({ deliveryPlanned: true }, { transaction });
        }

        return { message: "confirm ready delivery planning successfully" };
      });
    } catch (error) {
      console.error("❌ confirm ready delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=================================PLANNING DELIVERY=====================================

  getPlanningDelivery: async (deliveryDate: Date) => {
    try {
      const deliveries = await deliveryRepository.getPlanningDelivery(deliveryDate);

      const result = [];

      for (const plan of deliveries) {
        // giữ nguyên plan
        const planJson = plan.toJSON() as any;

        // hydrate từng item (chỉ gắn thêm order)
        for (const item of planJson.DeliveryItems ?? []) {
          if (item.targetType === "paper") {
            const paper = await PlanningPaper.findByPk(item.targetId, {
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
                    {
                      model: Customer,
                      attributes: ["customerName", "companyName", "shippingAddress"],
                    },
                    { model: Product, attributes: ["typeProduct", "productName"] },
                  ],
                },
              ],
            });

            item.Order = paper?.Order ?? null;
          }

          if (item.targetType === "box") {
            const box = await PlanningBox.findByPk(item.targetId, {
              include: [
                {
                  model: Order,
                  include: [
                    { model: Customer, attributes: ["customerName", "companyName"] },
                    { model: Product, attributes: ["typeProduct", "productName"] },
                  ],
                },
              ],
            });

            item.Order = box?.Order ?? null;
          }
        }

        result.push(planJson);
      }

      return {
        message: "get planning delivery successfully",
        data: result,
      };
    } catch (error) {
      console.error("❌ get planning delivery failed:", error);
      throw AppError.ServerError();
    }
  },

  createDeliveryPlan: async ({
    deliveryDate,
    items,
  }: {
    deliveryDate: Date;
    items: {
      targetType: targetType;
      targetId: number;
      vehicleId: number;
      sequence: number;
    }[];
  }) => {
    try {
      if (!deliveryDate || !items || items.length === 0) {
        throw AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
      }

      return await runInTransaction(async (transaction) => {
        const existedPlan = await DeliveryPlan.findOne({
          where: { deliveryDate },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (existedPlan) {
          throw AppError.BadRequest(
            "Delivery plan for this date already exists",
            "DELIVERY_PLAN_EXISTED"
          );
        }

        // Tạo deliveryPlan
        const deliveryPlan = await DeliveryPlan.create(
          { deliveryDate, status: "planned" },
          { transaction }
        );

        // 3️⃣ Validate target tồn tại
        for (const item of items) {
          if (item.targetType === "paper") {
            const exists = await PlanningPaper.findByPk(item.targetId, {
              transaction,
            });
            if (!exists) {
              throw AppError.BadRequest(
                `PlanningPaper ${item.targetId} not found`,
                "PLANNING_PAPER_NOT_FOUND"
              );
            }
          }

          if (item.targetType === "box") {
            const exists = await PlanningBox.findByPk(item.targetId, {
              transaction,
            });
            if (!exists) {
              throw AppError.BadRequest(
                `PlanningBox ${item.targetId} not found`,
                "PLANNING_BOX_NOT_FOUND"
              );
            }
          }
        }

        // 4️⃣ Tạo deliveryPlanItem
        const deliveryItems = items.map((item) => ({
          deliveryId: deliveryPlan.deliveryId,
          targetType: item.targetType,
          targetId: item.targetId,
          vehicleId: item.vehicleId,
          sequence: item.sequence,
          status: "planned" as statusDeliveryItem,
        }));

        await DeliveryItem.bulkCreate(deliveryItems, { transaction });

        return { message: "Create delivery plan success" };
      });
    } catch (error) {
      console.error("❌ create delivery plan failed:", error);
      if (error instanceof AppError) throw error;
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
