import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Request } from "express";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX, meiliService } from "../meiliService";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { MachinePaper } from "../../models/admin/machinePaper";
import { PlanningBox } from "../../models/planning/planningBox";
import redisCache from "../../assest/configs/connect/redis.config";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { planningHelper } from "../../repository/planning/planningHelper";
import { meiliClient } from "../../assest/configs/connect/melisearch.config";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { calculateTimeRunning, updateSortPlanning } from "./helper/timeRunningPaper";
import { machinePaperType, PlanningPaper } from "../../models/planning/planningPaper";
import { planningPaperRepository } from "../../repository/planning/planningPaperRepository";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = CacheKey.planning;

export const planningPaperService = {
  //====================================PLANNING PAPER========================================
  getPlanningPaperByMachine: async (machine: string) => {
    try {
      const cacheKey = paper.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningPaper },
          { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
        ],
        "planningPaper",
      );

      if (isChanged) {
        await CacheManager.clear("planningPaper");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data PlanningPaper from Redis");
          return {
            message: `get all cache planning:machine:${machine}`,
            data: JSON.parse(cachedData),
          };
        }
      }

      const data = await planningPaperService.getPlanningPaperSorted(machine);

      await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

      return { message: `get planning by machine: ${machine}`, data };
    } catch (error) {
      console.error("❌ get planning paper by machine failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //get sort planning
  getPlanningPaperSorted: async (machine: string) => {
    try {
      const { rows: data } = await planningPaperRepository.getPlanningPaper({
        whereCondition: {
          chooseMachine: machine,
          status: { [Op.ne]: "stop" },
        },
      });

      //lọc đơn complete trong 1 ngày
      const truncateToDate = (date: Date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const now = truncateToDate(new Date());

      const validData = data.filter((planning) => {
        if (["planning", "lackQty", "producing"].includes(planning.status)) return true;

        if (planning.status === "complete") {
          const dayCompleted = planning.dayCompleted ? new Date(planning.dayCompleted) : null;
          if (!dayCompleted || isNaN(dayCompleted.getTime())) return false;

          const expiredDate = truncateToDate(new Date(dayCompleted));
          expiredDate.setDate(expiredDate.getDate() + 1);

          return expiredDate >= now;
        }

        return false;
      });

      const withSort = validData.filter((item: any) => item.sortPlanning !== null);
      const noSort = validData.filter((item: any) => item.sortPlanning === null);

      // Sắp xếp đơn có sortPlanning theo thứ tự được lưu
      withSort.sort((a, b) => (a.sortPlanning ?? 0) - (b.sortPlanning ?? 0));

      // Sắp xếp đơn chưa có sortPlanning theo logic yêu cầu
      noSort.sort((a, b) => {
        const wavePriorityMap: Record<"C" | "B" | "E", number> = {
          C: 3,
          B: 2,
          E: 1,
        };

        //5BC -> 5
        const getLayer = (flute: string) => {
          if (!flute || flute.length < 1) return 0;
          return parseInt(flute.trim()[0]) || 0;
        };

        //5BC -> BC [2,3]
        const getWavePriorityList = (flute: string) => {
          if (!flute || flute.length < 2) return [];
          const waves = flute.trim().slice(1).toUpperCase().split("");
          return waves.map((w) => wavePriorityMap[w as keyof typeof wavePriorityMap] || 0);
        };

        //compare ghepKho -> layer (5BC -> 5) -> letter (5BC -> BC)
        const ghepA = a.ghepKho ?? 0;
        const ghepB = b.ghepKho ?? 0;
        if (ghepB !== ghepA) return ghepB - ghepA;

        // const layerA = getLayer(a.Order.flute ?? "");
        // const layerB = getLayer(b.Order.flute ?? "");
        // if (layerB !== layerA) return layerB - layerA;

        // const waveA = getWavePriorityList(a.Order.flute ?? "");
        // const waveB = getWavePriorityList(b.Order.flute ?? "");
        // const maxLength = Math.max(waveA.length, waveB.length);

        // for (let i = 0; i < maxLength; i++) {
        //   const priA = waveA[i] ?? 0;
        //   const priB = waveB[i] ?? 0;
        //   if (priB !== priA) return priB - priA;
        // }

        return 0;
      });

      const sortedPlannings = [...withSort, ...noSort];

      //Gộp overflow vào liền sau đơn gốc
      const allPlannings: any[] = [];
      const overflowRemoveFields = ["runningPlan", "quantityManufacture"];

      sortedPlannings.forEach((planning) => {
        const original = {
          ...planning.toJSON(),
          timeRunning: planning.timeRunning,
          dayStart: planning.dayStart,
        };
        allPlannings.push(original);

        if (planning.timeOverFlow) {
          const overflow: any = { ...planning.toJSON() };

          overflow.isOverflow = true;
          overflow.dayStart = planning.timeOverFlow.overflowDayStart;
          overflow.timeRunning = planning.timeOverFlow.overflowTimeRunning;
          overflow.dayCompleted = planning.timeOverFlow.overflowDayCompleted;

          overflowRemoveFields.forEach((f) => delete overflow[f]);
          if (overflow.Order) {
            ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach(
              (item) => delete overflow.Order[item],
            );
          }

          allPlannings.push(overflow);
        }
      });

      return allPlannings;
    } catch (error) {
      console.error("Error fetching planning by machine:", error);
      throw AppError.ServerError();
    }
  },

  getPlanningByField: async (machine: string, field: string, keyword: string) => {
    try {
      const validFields = ["orderId", "customerName", "ghepKho"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("planningPapers");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["planningId"],
        filter: `chooseMachine = "${machine}" AND status != "stop"`,
        limit: 100,
      });

      const planningIds = searchResult.hits.map((hit: any) => hit.planningId);
      if (!planningIds || planningIds.length === 0) {
        return { message: "No planning papers found", data: [] };
      }

      //query db
      const { rows } = await planningPaperRepository.getPlanningPaper({
        whereCondition: { planningId: { [Op.in]: planningIds } },
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = planningIds
        .map((id) => rows.find((p) => p.planningId === id))
        .filter(Boolean);

      return {
        message: `Search by ${field} from Meilisearch & DB`,
        data: finalData,
      };
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  changeMachinePlanning: async (planningIds: number[], newMachine: machinePaperType) => {
    try {
      const plannings = await planningPaperRepository.getPapersById({ planningIds });

      if (plannings.length === 0) {
        throw AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
      }

      for (const planning of plannings) {
        planning.chooseMachine = newMachine;
        planning.sortPlanning = null;
        await planning.save();
      }

      //--------------------MEILISEARCH-----------------------
      const dataForMeili = plannings.map((p) => ({
        planningId: p.planningId,
        chooseMachine: newMachine,
      }));

      meiliService.syncMeiliData(MEILI_INDEX.PLANNING_PAPERS, dataForMeili);

      return { message: "Change machine complete", plannings };
    } catch (error) {
      console.error("❌ change machine failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmCompletePlanningPaper: async (planningId: number | number[]) => {
    try {
      const ids = Array.isArray(planningId) ? planningId : [planningId];

      const planningPaper = await planningPaperRepository.getPapersById({
        planningIds: ids,
        options: {
          attributes: [
            "planningId",
            "runningPlan",
            "qtyProduced",
            "status",
            "hasOverFlow",
            "orderId",
            "statusRequest",
          ],
        },
      });
      if (planningPaper.length !== ids.length) {
        throw AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
      }

      // Kiểm tra sl từng đơn
      for (const paper of planningPaper) {
        const { qtyProduced, runningPlan } = paper;

        if ((qtyProduced ?? 0) < runningPlan) {
          throw AppError.BadRequest("Lack quantity", "LACK_QUANTITY");
        }

        //check đã nhập kho chưa
        if (paper.statusRequest !== "finalize") {
          throw AppError.BadRequest(
            `Mã đơn ${paper.orderId} chưa được chốt nhập kho`,
            "PLANNING_NOT_FINALIZED",
          );
        }
      }

      //cập nhật status planning
      await planningHelper.updateDataModel({
        model: PlanningPaper,
        data: { status: "complete" },
        options: { where: { planningId: ids } },
      });

      const overflowRows = await timeOverflowPlanning.findAll({
        where: { planningId: ids },
      });

      if (overflowRows.length) {
        await planningHelper.updateDataModel({
          model: timeOverflowPlanning,
          data: { status: "complete" },
          options: { where: { planningId: ids } },
        });
      }

      //--------------------MEILISEARCH-----------------------
      const dataForMeili = planningPaper.map((p) => ({
        planningId: p.planningId,
        status: "complete",
      }));

      meiliService.syncMeiliData(MEILI_INDEX.PLANNING_PAPERS, dataForMeili);

      return { message: "planning paper updated successfully" };
    } catch (error) {
      console.log(`error confirm complete planning`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  pauseOrAcceptLackQtyPLanning: async (
    planningIds: number[],
    newStatus: string,
    rejectReason?: string,
  ) => {
    try {
      const plannings = await planningPaperRepository.getPapersById({ planningIds });
      if (plannings.length === 0) {
        throw AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
      }

      if (newStatus !== "complete") {
        for (const planning of plannings) {
          if (planning.orderId) {
            const order = await planningHelper.getModelById({
              model: Order,
              where: { orderId: planning.orderId },
            });

            if (order) {
              //case: cancel planning -> status:reject order
              //if qtyProduced = 0 -> status:reject order -> delete planning paper&box -> minus debt of customer
              if (newStatus === "reject") {
                if ((planning.qtyProduced ?? 0) > 0) {
                  throw AppError.Conflict(
                    `Cannot reject planning ${planning.planningId} has produced quantity.`,
                    "CANNOT_REJECT_PRODUCED_PLANNING",
                  );
                }

                // Trả order về reject
                await planningHelper.updateDataModel({
                  model: order,
                  data: {
                    status: newStatus,
                    rejectReason,
                  },
                });

                // Trừ công nợ khách hàng
                // const customer = await planningRepository.getModelById(
                //   Customer,
                //   { customerId: order.customerId },
                //   { attributes: ["customerId", "debtCurrent"] }
                // );

                // if (customer) {
                //   let debtAfter = (customer.debtCurrent || 0) - order.totalPrice;
                //   if (debtAfter < 0) debtAfter = 0; //tránh âm tiền

                //   await planningRepository.updateDataModel(customer, { debtCurrent: debtAfter });
                // }

                // Xoá dữ liệu phụ thuộc
                const dependents = await planningPaperRepository.getBoxByPlanningId(
                  planning.planningId,
                );

                for (const box of dependents) {
                  await planningHelper.deleteModelData({
                    model: PlanningBoxTime,
                    where: { planningBoxId: box.planningBoxId },
                  });

                  await box.destroy();
                }

                //xóa planning paper
                const deletedId = planning.planningId;
                await planning.destroy();

                //--------------------MEILISEARCH-----------------------
                meiliService.deleteMeiliData(MEILI_INDEX.PLANNING_PAPERS, deletedId);
                meiliService.syncMeiliData(MEILI_INDEX.ORDERS, {
                  orderSortValue: order.orderSortValue,
                  status: newStatus,
                });
              }
              //case pause planning -> status:accept or stop order
              //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
              //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
              else if (newStatus === "stop") {
                const dependents = await planningPaperRepository.getBoxByPlanningId(
                  planning.planningId,
                );

                if ((planning.qtyProduced ?? 0) > 0) {
                  await planningHelper.updateDataModel({
                    model: order,
                    data: {
                      status: newStatus,
                      rejectReason: rejectReason,
                    },
                  });

                  await planningHelper.updateDataModel({
                    model: planning,
                    data: { status: newStatus },
                  });

                  for (const box of dependents) {
                    await planningHelper.updateDataModel({
                      model: PlanningBoxTime,
                      data: { status: newStatus },
                      options: { where: { planningBoxId: box.planningBoxId } },
                    });
                  }

                  //--------------------MEILISEARCH-----------------------
                  meiliService.syncMeiliData(MEILI_INDEX.PLANNING_PAPERS, {
                    planningId: planning.planningId,
                    status: newStatus,
                  });
                  meiliService.syncMeiliData(MEILI_INDEX.ORDERS, {
                    orderSortValue: order.orderSortValue,
                    status: newStatus,
                  });
                } else {
                  await planningHelper.updateDataModel({
                    model: order,
                    data: { status: "accept" },
                  });

                  for (const box of dependents) {
                    await planningHelper.deleteModelData({
                      model: PlanningBoxTime,
                      where: { planningBoxId: box.planningBoxId },
                    });

                    await box.destroy();
                  }

                  const deletedId = planning.planningId;
                  await planning.destroy();
                  await CacheManager.clear("orderAccept");

                  //--------------------MEILISEARCH-----------------------
                  meiliService.deleteMeiliData(MEILI_INDEX.PLANNING_PAPERS, deletedId);
                  meiliService.syncMeiliData(MEILI_INDEX.ORDERS, {
                    orderSortValue: order.orderSortValue,
                    status: "accept",
                  });
                }
              }
            }
          }
        }
      } else {
        // complete -> accept lack of qty
        for (const planning of plannings) {
          if (planning.sortPlanning === null) {
            throw AppError.BadRequest(
              "Cannot pause planning without sortPlanning",
              "CANNOT_PAUSE_WITHOUT_SORT",
            );
          }

          planning.status = newStatus;
          await planning.save();

          if (planning.hasOverFlow) {
            await planningHelper.updateDataModel({
              model: timeOverflowPlanning,
              data: { status: newStatus },
              options: { where: { planningId: planning.planningId } },
            });
          }

          const planningBox = await planningHelper.getModelById({
            model: PlanningBox,
            where: {
              planningId: planning.planningId,
            },
          });

          if (planningBox) {
            await planningHelper.updateDataModel({
              model: PlanningBoxTime,
              data: { runningPlan: planning.qtyProduced ?? 0 },
              options: { where: { planningBoxId: planningBox.planningBoxId } },
            });
          }

          //--------------------MEILISEARCH-----------------------
          meiliService.syncMeiliData(MEILI_INDEX.PLANNING_PAPERS, {
            planningId: planning.planningId,
            status: newStatus,
          });
        }
      }

      return { message: "Update status planning successfully" };
    } catch (error) {
      console.log("error pause or accept planning", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateIndex_TimeRunning: async ({
    updateIndex,
    machine,
    dayStart,
    timeStart,
    totalTimeWorking,
    isNewDay,
  }: {
    updateIndex: any[];
    machine: string;
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
    isNewDay: boolean;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        // Cập nhật sortPlanning
        await updateSortPlanning(updateIndex, transaction);

        // Lấy lại danh sách đã update
        const plannings = await planningPaperRepository.getPapersByUpdateIndex(
          updateIndex,
          transaction,
        );

        // Lấy thông tin máy
        const machineInfo = await planningHelper.getModelById({
          model: MachinePaper,
          where: { machineName: machine },
        });
        if (!machineInfo) throw AppError.NotFound("Machine not found", "MACHINE_NOT_FOUND");

        // Tính toán thời gian chạy
        const updatedPlannings = await calculateTimeRunning({
          plannings,
          machineInfo,
          machine,
          dayStart,
          timeStart,
          totalTimeWorking,
          isNewDay,
          transaction,
        });

        return {
          message: "Cập nhật sortPlanning + tính thời gian thành công",
          data: updatedPlannings,
        };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //planningPaperUpdated or planningBoxUpdated
  notifyUpdatePlanning: async ({
    req,
    isPlan,
    machine,
    keyName,
    senderId,
  }: {
    req: Request;
    isPlan: boolean;
    machine: string;
    keyName: string;
    senderId?: number;
  }) => {
    try {
      const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;

      let item: any = {};
      isPlan
        ? (item = {
            isPlan,
            from: "Kế hoạch",
            machine,
            message: `Kế hoạch cho ${machine} đã được cập nhật.`,
            senderId,
          })
        : (item = { isPlan, message: `Chỉ định sản xuất cho đơn hàng thành công`, senderId });

      req.io?.to(roomName).emit(keyName, item);

      return { message: "Đã gửi thông báo cập nhật kế hoạch" };
    } catch (error) {
      console.error("❌Lỗi khi gửi socket:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
