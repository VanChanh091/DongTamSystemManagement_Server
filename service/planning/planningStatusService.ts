import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Request } from "express";
import { User } from "../../models/user/user";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { meiliService } from "../meiliService";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningBox } from "../../models/planning/planningBox";
import { WasteNormPaper } from "../../models/admin/wasteNormPaper";
import { machineMap, MEILI_INDEX } from "../../assets/labelFields";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { planningHelper } from "../../repository/planning/planningHelper";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { WaveCrestCoefficient } from "../../models/admin/waveCrestCoefficient";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { PlanningPaper, planningPaperStatus } from "../../models/planning/planningPaper";
import { planningStatusRepository } from "../../repository/planning/planningStatusRepository";
import { planningPaperRepository } from "../../repository/planning/planningPaperRepository";
import { planningBoxRepository } from "../../repository/planning/planningBoxRepository";

const devEnvironment = process.env.NODE_ENV !== "production";
const { stop, order } = CacheKey.planning;

export const planningStatusService = {
  //===============================PLANNING ORDER=====================================

  //"unplanned" | "planned" | "partial"
  getOrderAccept: async (filter: string) => {
    const cacheKey = order.all;

    try {
      // const { isChanged: order } = await CacheManager.check(
      //   [{ model: Order, where: { status: "accept" } }],
      //   "planningOrder",
      // );

      // const { isChanged: planningPaper } = await CacheManager.check(
      //   [
      //     { model: PlanningPaper },
      //     { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
      //   ],
      //   "planningOrderPaper",
      //   { setCache: false },
      // );

      // const isChangedData = order || planningPaper;

      // if (isChangedData) {
      //   await CacheManager.clear("orderAccept");
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     return { ...JSON.parse(cachedData), fromCache: true };
      //   }
      // }

      const result = await planningStatusRepository.getOrderAccept(filter);

      // await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

      return { message: "get order accept successfully", data: result };
    } catch (error) {
      console.error("❌ get all order accept failed:", error);
      throw AppError.ServerError();
    }
  },

  getOrderAcceptByField: async (type: string, field: string, keyword: string) => {
    try {
      const validFields = ["orderId", "customerName", "productName", "QC_box"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("orders");

      // Tìm kiếm trên Meilisearch để lấy orderId
      const searchResult = await index.search(keyword, {
        filter: ["status IN [accept]"],
        attributesToSearchOn: [field],
        attributesToRetrieve: ["orderId"], // Chỉ lấy orderId
      });

      const orderIds = searchResult.hits.map((hit: any) => hit.orderId);
      if (orderIds.length === 0) {
        return { message: "No orders found", data: [] };
      }

      const result = await planningStatusRepository.getOrderAccept(type);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = orderIds
        .map((id) => result.find((order) => order.orderId === id))
        .filter(Boolean);

      return { message: `get order accept by ${field} successfully`, data: finalData };
    } catch (error) {
      console.error(`Failed to get orders by ${field}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  planningOrder: async (orderId: string, planningData: any) => {
    try {
      return await runInTransaction(async (transaction) => {
        // 1) Lấy thông tin Order kèm các quan hệ
        const order = await planningStatusRepository.findOrderById(orderId, transaction);
        if (!order) throw AppError.NotFound("Order not found", "ORDER_NOT_FOUND");

        const { chooseMachine } = planningData;

        // 2) Lấy thông số định mức và hệ số sóng cho máy đã chọn
        const wasteNorm = await planningHelper.getModelById({
          model: WasteNormPaper,
          where: { machineName: chooseMachine },
          transaction,
        });

        const waveCoeff = await planningHelper.getModelById({
          model: WaveCrestCoefficient,
          where: { machineName: chooseMachine },
          transaction,
        });

        if (!wasteNorm || !waveCoeff) {
          throw new Error(
            `WasteNorm or WaveCrestCoefficient not found for machine: ${chooseMachine}`,
          );
        }

        // 3) Parse cấu trúc giấy thành mảng lớp
        const structStr = [
          planningData.dayReplace,
          planningData.songEReplace,
          planningData.matEReplace,
          planningData.songBReplace,
          planningData.matBReplace,
          planningData.songCReplace,
          planningData.matCReplace,
          planningData.songE2Replace,
          planningData.matE2Replace,
        ]
          .filter(Boolean)
          .join("/");

        const parseStructure = (str: string) =>
          str.split("/").map((seg: string) => {
            if (/^[EBC]/.test(seg)) return { kind: "flute", code: seg };
            return {
              kind: "liner",
              thickness: parseFloat(seg.replace(/\D+/g, "")),
            };
          });

        const layers = parseStructure(structStr);

        // 4) Xác định loại sóng từ đơn hàng (flute: "5EB" => ["E", "B"])
        const waveTypes = (order.flute?.match(/[EBC]/gi) || []).map((s: string) => s.toUpperCase());
        const roundSmart = (num: number) => Math.round(num * 100) / 100;

        // 5) Hàm tính phế liệu paper
        const calculateWaste = (
          layers: any[],
          ghepKho: number,
          wasteNorm: any,
          waveCoeff: any,
          runningPlan: number,
          numberChild: number,
          waveTypes: string[],
        ) => {
          const gkTh = ghepKho / 100;
          let flute = { E: 0, B: 0, C: 0, E2: 0 };
          let softLiner = 0;
          let countE = 0;

          for (let i = 0; i < layers.length; i++) {
            const L = layers[i];
            if (L.kind === "flute") {
              const letter = L.code[0].toUpperCase();

              if (!waveTypes.includes(letter)) continue;

              const fluteTh = parseFloat(L.code.replace(/\D+/g, "")) / 1000;
              const prev = layers[i - 1];
              const linerBefore = prev && prev.kind === "liner" ? prev.thickness / 1000 : 0;

              let coef = 0;
              if (letter === "E") {
                const isFirstE = countE === 0;
                coef = isFirstE ? waveCoeff.fluteE_1 : waveCoeff.fluteE_2;

                const loss =
                  gkTh * wasteNorm.waveCrest * linerBefore +
                  gkTh * wasteNorm.waveCrest * fluteTh * coef;

                if (isFirstE) {
                  flute.E += loss;
                } else {
                  flute.E2 += loss;
                }

                countE++;
              } else {
                coef = waveCoeff[`flute${letter}`] || 0;

                const loss =
                  gkTh * wasteNorm.waveCrest * linerBefore +
                  gkTh * wasteNorm.waveCrest * fluteTh * coef;

                if (letter in flute) {
                  flute[letter as keyof typeof flute] += loss;
                }
              }
            }
          }

          // 5.1) Lớp liner cuối cùng
          const lastLiner = [...layers].reverse().find((l) => l.kind === "liner");
          if (lastLiner) {
            softLiner = gkTh * wasteNorm.waveCrestSoft * (lastLiner.thickness / 1000);
          }

          // 5.2) Tính hao phí, dao, tổng hao hụt
          const bottom = flute.E + flute.B + flute.C + softLiner;

          const totalLength = runningPlan / numberChild;
          const oneM2WaveCrestSoft = bottom / wasteNorm.waveCrestSoft;

          const haoPhi =
            wasteNorm.waveCrestSoft > 0
              ? totalLength * oneM2WaveCrestSoft * (wasteNorm.lossInProcess / 100)
              : 0;

          const knife =
            wasteNorm.waveCrestSoft > 0
              ? oneM2WaveCrestSoft * wasteNorm.lossInSheetingAndSlitting
              : 0;

          const totalLoss = flute.E + flute.B + flute.C + flute.E2 + haoPhi + knife + bottom;

          return {
            fluteE: roundSmart(flute.E),
            fluteB: roundSmart(flute.B),
            fluteC: roundSmart(flute.C),
            fluteE2: roundSmart(flute.E2),
            bottom: roundSmart(bottom),
            haoPhi: roundSmart(haoPhi),
            knife: roundSmart(knife),
            totalLoss: roundSmart(totalLoss),
          };
        };

        // 6) Tạo kế hoạch làm giấy tấm
        const paperPlan = await planningHelper.createData({
          model: PlanningPaper,
          data: {
            orderId,
            status: "planning",
            ...planningData,
          },
          transaction,
        });

        // 7) Tính phế liệu và cập nhật lại plan giấy tấm
        const waste = calculateWaste(
          layers,
          planningData.ghepKho,
          wasteNorm,
          waveCoeff,
          planningData.runningPlan,
          order.numberChild,
          waveTypes,
        );
        Object.assign(paperPlan, waste);
        await paperPlan.save({ transaction });

        let boxPlan = null;

        // 8) Nếu đơn hàng có làm thùng, tạo thêm kế hoạch làm thùng
        const box = order.box;
        if (order.isBox) {
          boxPlan = await planningHelper.createData({
            model: PlanningBox,
            data: {
              planningId: paperPlan.planningId,
              orderId,

              day: paperPlan.dayReplace,
              matE: paperPlan.matEReplace,
              matB: paperPlan.matBReplace,
              matC: paperPlan.matCReplace,
              matE2: paperPlan.matE2Replace,
              songE: paperPlan.songEReplace,
              songB: paperPlan.songBReplace,
              songC: paperPlan.songCReplace,
              songE2: paperPlan.songE2Replace,
              length: paperPlan.lengthPaperPlanning,
              size: paperPlan.sizePaperPLaning,

              hasIn: !!(box.inMatTruoc || box.inMatSau),
              hasCanLan: !!box.canLan,
              hasBe: !!box.be,
              hasXa: !!box.Xa,
              hasDan: !!(box.dan_1_Manh || box.dan_2_Manh),
              hasCatKhe: !!box.catKhe,
              hasCanMang: !!box.canMang,
              hasDongGhim: !!(box.dongGhim1Manh || box.dongGhim2Manh),
            },
            transaction,
          });
        }

        //9) dựa vào các hasIn, hasBe, hasXa... để tạo ra planning box time
        if (boxPlan) {
          const machineTimes = Object.entries(machineMap)
            .filter(([flag]) => boxPlan[flag as keyof typeof boxPlan] === true)
            .map(([_, machineName]) => ({
              planningBoxId: boxPlan.planningBoxId,
              machine: machineName,
              runningPlan: paperPlan.runningPlan,
            }));

          if (machineTimes.length > 0) {
            await planningStatusRepository.createPlanningBoxTime(machineTimes, transaction);
          }
        }

        //--------------------MEILISEARCH-----------------------
        const paperToSync = await planningPaperRepository.syncPaperFromOrderToMeili(
          paperPlan.planningId,
          transaction,
        );

        if (paperToSync) {
          const flatPaperData = meiliTransformer.planningPaper(paperToSync);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.PLANNING_PAPERS,
            data: flatPaperData,
            transaction,
          });

          if (order.isBox) {
            const boxToSync = await planningBoxRepository.syncPlanningBoxByPlanningId(
              paperToSync.planningId,
              transaction,
            );

            const flatBoxData = meiliTransformer.planningBox(boxToSync);
            await meiliService.syncOrUpdateMeiliData({
              indexKey: MEILI_INDEX.PLANNING_BOXES,
              data: flatBoxData,
              transaction,
            });
          }
        }

        return {
          message: "Đã tạo kế hoạch thành công.",
          planning: [paperPlan, boxPlan].filter(Boolean),
        };
      });
    } catch (error) {
      console.error("planningOrder error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  backOrderToReject: async (req: Request, orderId: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const order = await Order.findOne({
          where: { orderId },
          attributes: ["orderId", "userId", "orderSortValue"],
          include: [{ model: User, attributes: ["fullName"] }],
          transaction,
        });
        if (!order) {
          throw AppError.BadRequest("Order not found", "ORDER_NOT_FOUND");
        }

        const planningPapers = await PlanningPaper.findAll({
          where: { orderId },
          attributes: ["planningId", "qtyProduced"],
          transaction,
        });
        if (planningPapers.some((p) => (p.qtyProduced ?? 0) > 0)) {
          throw AppError.BadRequest("Order has produced items", "ORDER_HAS_PRODUCED_ITEMS");
        }

        await order.update({ status: "reject" }, { transaction });

        //socket
        const ownerId = order.userId;
        const badgeCount = await Order.count({
          where: { status: "reject", userId: ownerId },
          transaction,
        });

        const roomName = `reject-order-${ownerId}`;
        const sockets = await req.io?.in(roomName).fetchSockets();

        // console.log(`-----------------------------------`);
        // console.log(`📡 Event: updateBadgeCount`);
        // console.log(`🏠 Room Target: ${roomName}`);
        // console.log(`👥 Active sockets: ${sockets?.length ?? 0}`);
        // console.log(`-----------------------------------`);

        const hasSocket = sockets && sockets.length > 0;
        if (!hasSocket) {
          if (devEnvironment) {
            console.log(`⚠️ No one is in room ${roomName}, skip emitting.`);
          }
          return { message: "Order status updated successfully, no active socket to notify" };
        }

        req.io?.to(roomName).emit("updateBadgeCount", {
          type: "REJECTED_ORDER",
          count: badgeCount,
        });

        //--------------------MEILISEARCH-----------------------
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.ORDERS,
          data: { orderSortValue: order.orderSortValue, status: "reject" },
          transaction,
          isUpdate: true,
        });
      });
    } catch (error) {
      console.error("back order failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================PLANNING STOP=====================================

  getPlanningStop: async (page: number, pageSize: number) => {
    try {
      const cacheKey = stop.page(page);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningPaper },
          { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
        ],
        "planningStop",
      );

      if (isChanged) {
        await CacheManager.clear("planningStop");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data PlanningPaper from Redis");
          return { ...JSON.parse(cachedData), message: `get all cache planning stop` };
        }
      }

      const whereCondition = { status: "stop" };
      const { rows, count } = await planningPaperRepository.getPlanningPaper({
        page,
        pageSize,
        whereCondition,
        paginate: true,
      });
      const totalPages = Math.ceil(count / pageSize);

      const responseData = {
        message: "get all data paper from db",
        data: rows,
        totalPlannings: count,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("Error fetching planning stop:", error);
      throw AppError.ServerError();
    }
  },

  cancelOrContinuePlannning: async ({
    planningId,
    action,
  }: {
    planningId: number | number[];
    action: planningPaperStatus; //planning or cancel
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const ids = Array.isArray(planningId) ? planningId : [planningId];

        const plannings = await planningStatusRepository.getStopByIds(ids, transaction);
        if (plannings.length == 0) {
          throw AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
        }

        const planningUpdated = await planningStatusRepository.updateStatusPlanning({
          planningIds: ids,
          action: action,
          transaction,
        });

        const orderIds = [...new Set(planningUpdated.map((p: any) => p.orderId))] as string[];
        if (action === "planning") {
          await Order.update(
            { status: "planning" },
            { where: { orderId: { [Op.in]: orderIds } }, transaction },
          );
        }

        //--------------------MEILISEARCH-----------------------
        if (planningUpdated.length > 0) {
          const dataForMeili = planningUpdated.map((p: any) => ({
            planningId: p.planningId,
            status: action,
          }));

          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.PLANNING_PAPERS,
            data: dataForMeili,
            transaction,
            isUpdate: true,
          });
        }

        return { message: "planning updated successfully" };
      });
    } catch (error) {
      console.error("error to cancel or continue planning stop:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
