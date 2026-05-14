import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { PlanningBox } from "../../models/planning/planningBox";
import { QcSession } from "../../models/qualityControl/qcSession";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { deliveryScheduleService } from "./deliveryScheduleService";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { DeliveryRequest } from "../../models/delivery/deliveryRequest";
import { deliveryRepository } from "../../repository/deliveryRepository";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { calculateVolume } from "../../utils/helper/modelHelper/orderHelpers";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";

export const deliveryEstimateService = {
  getPlanningEstimateTime: async ({
    page = 1,
    pageSize = 20,
    dayStart,
    estimateTime,
    userId,
    all = "false",
  }: {
    page?: number;
    pageSize?: number;
    dayStart: Date;
    estimateTime: string;
    userId: number;
    all: string;
  }) => {
    // const cacheKey = estimate.page(page);

    try {
      // const { isChanged } = await CacheManager.check(PlanningPaper, "estimate");

      // if (isChanged) {
      //   await CacheManager.clear("estimate");
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ get planning estimate time from cache");
      //     return { ...JSON.parse(cachedData), message: "get all planning estimate from cache" };
      //   }
      // }

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

      const plannings = await deliveryRepository.getPlanningEstimateTime(dayStart, userId, all);

      //filter
      const filtered = deliveryEstimateService.filterPlanningEstimateTime({
        plannings,
        dayStart,
        estimateTime,
      });

      //PAGING DATA
      const totalPlannings = filtered.length;
      const totalPages = Math.ceil(totalPlannings / pageSize);

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const pageData = filtered.slice(startIndex, endIndex);

      //remove Planning box for UI
      // const data = pageData.map((p: any) => {
      //   const plain = p.get({ plain: true });
      //   delete plain.PlanningBox;
      //   return plain;
      // });

      const responseData = {
        message: "get all data paper from db",
        data: pageData,
        totalPlannings,
        totalPages,
        currentPage: page,
      };

      // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get planning estimate time failed:", error);
      throw AppError.ServerError();
    }
  },

  getPlanningEstimateByField: async ({
    page = 1,
    pageSize = 20,
    dayStart,
    estimateTime,
    userId,
    all = "false",
    field,
    keyword,
  }: {
    page?: number;
    pageSize?: number;
    dayStart: Date;
    estimateTime: string;
    userId: number;
    all: string;
    field: string;
    keyword: string;
  }) => {
    const filterStatus = ["stop", "cancel"];
    const index = meiliClient.index("planningPapers");

    try {
      const validFields = ["orderId", "customerName"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["planningId"],
        filter: `status NOT IN ${JSON.stringify(filterStatus)}`,
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSizes
      });

      const planningIds = searchResult.hits.map((hit: any) => hit.planningId);
      if (planningIds.length === 0) {
        return {
          message: "No planning papers found",
          data: [],
          totalPlannings: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      const plannings = await deliveryRepository.getPlanningEstimateTime(dayStart, userId, all);

      const filtered = deliveryEstimateService.filterPlanningEstimateTime({
        plannings,
        dayStart,
        estimateTime,
      });

      const data = planningIds
        .map((id) => filtered.find((p) => p.planningId === id))
        .filter(Boolean);

      const finalData = data.map((p: any) => {
        const plain = typeof p.get === "function" ? p.get({ plain: true }) : p;
        delete plain.PlanningBox;
        return plain;
      });

      return {
        message: `Search by ${field} from Meilisearch & DB`,
        data: finalData,
        totalPlannings: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error(`Failed to get planning estimate by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  filterPlanningEstimateTime: ({
    plannings,
    dayStart,
    estimateTime,
  }: {
    plannings: any[];
    dayStart: Date;
    estimateTime: string;
  }) => {
    // mốc kết thúc NGÀY HÔM NAY
    const [estH, estM] = estimateTime.split(":").map(Number);
    const estimateMinutes = estH * 60 + estM;

    return plannings.filter((paper) => {
      if (paper.status === "complete") return true;

      //check day
      if (!paper.dayStart) return false;
      const paperDate = new Date(paper.dayStart).setHours(0, 0, 0, 0);
      const targetDate = new Date(dayStart).setHours(0, 0, 0, 0);

      // console.log(
      //   `paperDate: ${paperDate} - targetDate: ${targetDate} - compare: ${paperDate < targetDate}`,
      // );

      //if paper date < target date → show
      if (paperDate < targetDate) return true;

      // console.log(`estimateMinutes: ${estimateMinutes}`);

      // KHÔNG CÓ BOX → so paper
      if (!paper.hasBox) {
        if (!paper.timeRunning) return false;

        const [h, m, s = "0"] = paper.timeRunning.split(":");
        const paperMinutes = Number(h) * 60 + Number(m) + Number(s) / 60;

        // console.log(`time paper: ${paperMinutes}`);
        // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);

        return paperMinutes <= estimateMinutes;
      } else {
        // CÓ BOX → so theo BOX
        const boxTimes = paper.PlanningBox?.boxTimes ?? [];

        if (boxTimes.length === 0) return false;

        const latestBoxMinutes = Math.max(
          ...boxTimes.map((t: any) => {
            const [h, m, s = "0"] = t.timeRunning.split(":");

            return Number(h) * 60 + Number(m) + Number(s) / 60;
          }),
        );

        // console.log(`latest time box: ${latestBoxMinutes}`);
        // console.log(`compare box: ${latestBoxMinutes <= estimateMinutes}`);

        return latestBoxMinutes <= estimateMinutes;
      }
    });
  },

  registerQtyDelivery: async ({
    planningId,
    qtyRegistered,
    userId,
  }: {
    planningId: number;
    qtyRegistered: number;
    userId: number;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!planningId || !qtyRegistered || qtyRegistered <= 0) {
          throw AppError.BadRequest("missing parameters", "MISSING_PARAMETERS");
        }

        const planning = await deliveryRepository.getPaperWaitingRegister(planningId, transaction);
        if (!planning) {
          throw AppError.BadRequest("Planning không tồn tại", "PLANNING_NOT_FOUND");
        }

        const newDeliveryStatus = qtyRegistered === planning.qtyProduced ? "delivered" : "pending";

        //calculate volume
        const volume = await calculateVolume({
          flute: planning.Order.flute ?? "",
          lengthCustomer: planning.Order.lengthPaperCustomer,
          sizeCustomer: planning.Order.paperSizeCustomer,
          quantity: qtyRegistered,
          transaction,
        });

        const request = await DeliveryRequest.create(
          {
            planningId,
            userId,
            qtyRegistered,
            volume,
            status: "requested",
          },
          { transaction },
        );

        // Cập nhật trạng thái PlanningPaper
        await PlanningPaper.update(
          { deliveryPlanned: newDeliveryStatus },
          { where: { planningId }, transaction },
        );

        //--------------------MEILISEARCH-----------------------
        const requetsCreated = await deliveryRepository.getDeliveryRequestForMeili(
          request.requestId,
          transaction,
        );
        if (requetsCreated) {
          const flattenData = meiliTransformer.deliveryRequest(requetsCreated);

          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.DELIVERY_REQUEST,
            data: flattenData,
            transaction,
          });
        }

        return {
          message: "Xác nhận đăng ký giao hàng thành công",
          data: { statusPlanning: newDeliveryStatus, volume },
        };
      });
    } catch (error) {
      console.error("❌ confirm ready delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  closePlanning: async ({
    planningIds,
    isPaper = true,
  }: {
    planningIds: number | number[];
    isPaper: boolean;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const idArray = Array.isArray(planningIds) ? planningIds : [planningIds];

        // Lấy dữ liệu Planning
        let papers: any[] = [];
        let boxes: any[] = [];

        if (isPaper) {
          papers = await PlanningPaper.findAll({
            where: { planningId: idArray },
            transaction,
          });
        } else {
          boxes = await PlanningBox.findAll({
            where: { planningId: idArray },
            include: [
              {
                model: PlanningBoxTime,
                as: "boxTimes",
                attributes: ["qtyProduced", "machine"],
              },
            ],
            transaction,
          });
        }

        const records = isPaper ? papers : boxes;

        if (records.length === 0) {
          throw AppError.BadRequest("Không tìm thấy dữ liệu để đóng", "PLANNING_NOT_FOUND");
        }

        // Nếu là Paper: check theo planningId
        // Nếu là Box: check theo planningBoxId (PK của bảng Box)
        const checkKey = isPaper ? "planningId" : "planningBoxId";
        const targetIds = records.map((r) => r[checkKey]);

        // Kiểm tra tổng Inbound từ Warehouse
        const inboundSums = await warehouseRepository.getInboundSumByPlanning(checkKey, targetIds);

        const inboundMap = new Map(
          inboundSums.map((item: any) => [item[checkKey], Number(item.totalInbound) || 0]),
        );

        // Validation
        const orderIds = new Set<string>(); // Dùng Set để tránh trùng lặp ID

        for (const record of records) {
          const totalInbound = inboundMap.get(record[checkKey]) || 0;

          const qtyProduced = record.qtyProduced || 0;

          const orderId = record.orderId;
          if (orderId) orderIds.add(orderId);

          // Kiểm tra đã sản xuất chưa
          if (isPaper) {
            if (qtyProduced === 0) {
              throw AppError.BadRequest(
                `Không thể đóng đơn hàng chưa sản xuất: ${orderId}`,
                "CANNOT_CLOSE_EMPTY_PAPER",
              );
            }
          } else {
            const stages = record.boxTimes || [];

            if (stages.length === 0) {
              throw AppError.BadRequest(
                `Đơn hàng ${orderId} có công đoạn chưa có công đoạn sản xuất`,
                "NO_STAGES_FOUND",
              );
            }

            for (const stage of stages) {
              if ((stage.qtyProduced || 0) <= 0) {
                throw AppError.BadRequest(
                  `Đơn ${orderId}: Công đoạn ${stage.machine} chưa có sản lượng sản xuất.`,
                  "STAGE_NOT_PRODUCED",
                );
              }
            }
          }

          // Kiểm tra đã có nhập kho chưa
          if (totalInbound <= 0) {
            throw AppError.BadRequest(
              `Đơn hàng: ${orderId} chưa được nhập kho.`,
              "NO_INBOUND_HISTORY",
            );
          }
        }

        // cập nhật trạng thái (FINALIZED)
        const query: any = { where: { planningId: planningIds }, transaction };

        if (isPaper) {
          await PlanningPaper.update(
            { statusRequest: "finalize", deliveryPlanned: "delivered" },
            query,
          );
        } else {
          await PlanningBox.update({ statusRequest: "finalize" }, query);

          // Logic Master-Detail: Update Paper cha
          await PlanningPaper.update(
            { statusRequest: "finalize", deliveryPlanned: "delivered" },
            query,
          );
        }

        // Kết thúc session QC
        await QcSession.update(
          { status: "finalized" },
          { where: { [checkKey]: targetIds }, transaction },
        );

        if (orderIds.size > 0) {
          const listOrderIds = Array.from(orderIds);

          await Order.update(
            { status: "completed" },
            { where: { orderId: listOrderIds }, transaction },
          );

          //--------------------MEILISEARCH-----------------------
          await deliveryScheduleService._syncOrderForMeili(listOrderIds, transaction);
        }

        return {
          message: `Đóng đơn chờ giao thành công`,
          affectedIds: idArray,
        };
      });
    } catch (error) {
      console.error("❌ Close planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
