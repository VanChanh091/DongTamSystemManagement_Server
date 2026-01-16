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
import { FluteRatio } from "../models/admin/fluteRatio";
import { Vehicle } from "../models/admin/vehicle";

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
            deliveryPlanned: "none",
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

          await planning.update({ deliveryPlanned: "pending" }, { transaction });
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

  getPlanningPendingDelivery: async () => {
    try {
      const planningWaiting = await PlanningPaper.findAll({
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
            attributes: ["orderId", "dayReceiveOrder", "flute", "QC_box"],
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

      //remove Planning box and calculate volume
      const data = await Promise.all(
        planningWaiting.map(async (p: any) => {
          const plain = p.get({ plain: true });

          //calculate volume
          const ratioData = await FluteRatio.findOne({
            where: { fluteName: plain.Order?.flute },
            attributes: ["ratio"],
          });

          const lengthPaper = plain.lengthPaperPlanning ?? 0;
          const paperSize = plain.sizePaperPLaning ?? 0;
          const ratio = ratioData?.ratio ?? 1;

          const rawVolume = lengthPaper * paperSize * ratio;
          plain.volume = Math.round(rawVolume * 100) / 100;

          // delete plain.PlanningBox;
          return plain;
        })
      );

      return { message: "get planning waiting delivery successfully", data };
    } catch (error) {
      console.error("❌ get planning waiting delivery failed:", error);
      throw AppError.ServerError();
    }
  },

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

  //using for re-order  when hasn't confirm delivery
  getDeliveryPlanDetailForEdit: async (deliveryDate: Date) => {
    try {
      const plan = await DeliveryPlan.findOne({
        where: { deliveryDate },
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: DeliveryItem,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [{ model: Vehicle, attributes: ["vehicleName", "licensePlate"] }],
          },
        ],
        order: [["deliveryId", "ASC"]],
      });

      if (!plan) {
        return {
          message: "get delivery plan detail for edit successfully",
          data: [],
        };
      }

      const results: any[] = [];

      for (const item of plan.DeliveryItems ?? []) {
        let targetPlanningId: number | null = null;
        let paperData: any = null;

        if (item.targetType === "paper") {
          targetPlanningId = item.targetId;
        } else if (item.targetType === "box") {
          const box = await PlanningBox.findByPk(item.targetId, {
            attributes: ["planningId"],
          });
          targetPlanningId = box?.planningId ?? 0;
        }

        if (targetPlanningId) {
          const paper = await PlanningPaper.findByPk(targetPlanningId, {
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
          });

          if (paper) {
            paperData = paper.get({ plain: true }) as any;

            const ratioData = await FluteRatio.findOne({
              where: { fluteName: paperData.Order?.flute },
              attributes: ["ratio"],
            });

            const lengthPaper = paperData.lengthPaperPlanning ?? 0;
            const paperSize = paperData.sizePaperPLaning ?? 0;
            const ratio = ratioData?.ratio ?? 1;

            const rawVolume = lengthPaper * paperSize * ratio;
            paperData.volume = Math.round(rawVolume * 100) / 100;
          }

          results.push({
            ...item.get({ plain: true }),
            Planning: paperData,
          });
        }
      }

      return {
        message: "get delivery plan detail for edit successfully",
        data: [
          {
            deliveryId: plan.deliveryId,
            deliveryDate: plan.deliveryDate,
            note: plan.note,
            status: plan.status,
            DeliveryItems: results,
          },
        ],
      };
    } catch (error) {
      console.error("❌ get planning detail for edit:", error);
      if (error instanceof AppError) throw error;
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
      if (!deliveryDate || !items) {
        throw AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
      }

      return await runInTransaction(async (transaction) => {
        let existedPlan = await DeliveryPlan.findOne({
          where: { deliveryDate: new Date(deliveryDate) },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (existedPlan) {
          // --- UPDATE ---
          const oldItems = await DeliveryItem.findAll({
            where: { deliveryId: existedPlan.deliveryId },
            transaction,
          });

          const oldPaperIds = oldItems
            .filter((i) => i.targetType === "paper")
            .map((i) => i.targetId);
          const oldBoxIds = oldItems.filter((i) => i.targetType === "box").map((i) => i.targetId);

          // Lấy planningId từ Box để reset deliveryPlanned
          if (oldBoxIds.length > 0) {
            const boxes = await PlanningBox.findAll({
              where: { planningBoxId: oldBoxIds },
              attributes: ["planningId"],
              transaction,
            });
            oldPaperIds.push(...boxes.map((b) => b.planningId));
          }

          if (oldPaperIds.length > 0) {
            await PlanningPaper.update(
              { deliveryPlanned: "pending" },
              { where: { planningId: [...new Set(oldPaperIds)] }, transaction }
            );
          }

          await DeliveryItem.destroy({
            where: { deliveryId: existedPlan.deliveryId },
            transaction,
          });
        } else {
          // --- CREATE ---
          existedPlan = await DeliveryPlan.create(
            { deliveryDate, status: "none" },
            { transaction }
          );
        }

        if (items.length === 0) {
          return { message: "Clear delivery plan success" };
        }

        // 3️⃣ Validate target tồn tại
        const deliveryItems = items.map((item) => ({
          deliveryId: existedPlan!.deliveryId,
          targetType: item.targetType,
          targetId: item.targetId,
          vehicleId: item.vehicleId,
          sequence: item.sequence,
          status: "none" as statusDeliveryItem,
        }));

        await DeliveryItem.bulkCreate(deliveryItems, { transaction });

        // Cập nhật trạng thái planned cho các paper mới gửi lên
        const newPaperIds = items.filter((i) => i.targetType === "paper").map((i) => i.targetId);
        const newBoxIds = items.filter((i) => i.targetType === "box").map((i) => i.targetId);

        if (newBoxIds.length > 0) {
          const boxes = await PlanningBox.findAll({
            where: { planningBoxId: newBoxIds },
            attributes: ["planningId"],
            transaction,
          });
          newPaperIds.push(...boxes.map((b) => b.planningId));
        }

        await PlanningPaper.update(
          { deliveryPlanned: "planned" },
          { where: { planningId: [...new Set(newPaperIds)] }, transaction }
        );

        return { message: "Save delivery plan success" };
      });
    } catch (error) {
      console.error("❌ create delivery plan failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmForDeliveryPlanning: async (deliveryDate: Date) => {
    try {
      return await runInTransaction(async (transaction) => {
        let existedPlan = await DeliveryPlan.findOne({
          where: { deliveryDate: new Date(deliveryDate) },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!existedPlan) {
          throw AppError.NotFound("Không tìm thấy kế hoạch để xác nhận", "DELIVERY_PLAN_NOT_FOUND");
        }

        //update status delivery plan
        await existedPlan.update({ status: "planned" }, { transaction });

        //update status delivery item
        await DeliveryItem.update(
          { status: "planned" },
          {
            where: { deliveryId: existedPlan.deliveryId },
            transaction,
          }
        );

        return { message: "Chốt kế hoạch giao hàng thành công" };
      });
    } catch (error) {
      console.error("❌ confirm delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  cancelDeliveryPlan: async () => {
    try {
    } catch (error) {}
  },
};
