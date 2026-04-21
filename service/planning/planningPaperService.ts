import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { meiliService } from "../meiliService";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { MachinePaper } from "../../models/admin/machinePaper";
import { PlanningBox } from "../../models/planning/planningBox";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { planningHelper } from "../../repository/planning/planningHelper";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { calculateTimeRunning, updateSortPlanning } from "./helper/timeRunningPaper";
import { machinePaperType, PlanningPaper } from "../../models/planning/planningPaper";
import { planningPaperRepository } from "../../repository/planning/planningPaperRepository";
import { MEILI_INDEX } from "../../assets/labelFields";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { normalizeVN } from "../../utils/helper/normalizeVN";
import {
  mapPlanningPaperRow,
  planningPaperColumns,
} from "../../utils/mapping/planningPaperRowAndColumn";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = CacheKey.planning;

const filterStatus = ["planning", "lackQty", "producing", "requested"];

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
          status: { [Op.in]: filterStatus },
        },
      });

      const allPlannings = planningPaperService.applyPlanningSortAndOverflow(data);

      return allPlannings;
    } catch (error) {
      console.error("Error fetching planning by machine:", error);
      throw AppError.ServerError();
    }
  },

  applyPlanningSortAndOverflow: (data: any[]) => {
    // Phân loại
    const withSort = data.filter((item: any) => item.sortPlanning !== null);
    const noSort = data.filter((item: any) => item.sortPlanning === null);

    // Sắp xếp đơn có sortPlanning (sắp tăng)
    withSort.sort((a, b) => (a.sortPlanning ?? 0) - (b.sortPlanning ?? 0));

    // Sắp xếp đơn chưa có sortPlanning (sắp giảm theo ghepKho)
    noSort.sort((a, b) => (b.ghepKho ?? 0) - (a.ghepKho ?? 0));

    const sortedPlannings = [...withSort, ...noSort];

    // Gộp overflow vào liền sau đơn gốc
    const allPlannings: any[] = [];
    const overflowRemoveFields = ["runningPlan", "quantityManufacture"];

    sortedPlannings.forEach((planning) => {
      const planningJson = typeof planning.toJSON === "function" ? planning.toJSON() : planning;

      const original = {
        ...planningJson,
        timeRunning: planning.timeRunning,
        dayStart: planning.dayStart,
      };
      allPlannings.push(original);

      if (planning.timeOverFlow) {
        const overflow: any = { ...planningJson };
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
        filter: `chooseMachine = "${machine}" AND status IN ${JSON.stringify(filterStatus)}`,
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
      return await runInTransaction(async (transaction) => {
        const plannings = await planningPaperRepository.getPapersById({ planningIds, transaction });

        if (plannings.length === 0) {
          throw AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
        }

        for (const planning of plannings) {
          planning.chooseMachine = newMachine;
          planning.sortPlanning = null;
          await planning.save({ transaction });
        }

        //--------------------MEILISEARCH-----------------------
        const dataForMeili = plannings.map((p) => ({
          planningId: p.planningId,
          chooseMachine: newMachine,
        }));

        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.PLANNING_PAPERS,
          data: dataForMeili,
          transaction,
          isUpdate: true,
        });

        return { message: "Change machine complete", plannings };
      });
    } catch (error) {
      console.error("❌ change machine failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmCompletePlanningPaper: async (planningId: number | number[]) => {
    return await planningPaperService._updateStatusPaper(planningId, "complete", (papers) => {
      for (const p of papers) {
        if (p.status !== "requested") {
          throw AppError.BadRequest(
            `Đơn ${p.orderId} chưa được yêu cầu hoàn thành`,
            "PLANNING_NOT_REQUESTED",
          );
        }

        if ((p.qtyProduced ?? 0) < p.runningPlan) {
          throw AppError.BadRequest(`Đơn ${p.orderId} sản xuất thiếu số lượng`, "LACK_QUANTITY");
        }
      }
    });
  },

  _updateStatusPaper: async (
    planningId: number | number[],
    targetStatus: "requested" | "complete",
    extraValidator: (papers: PlanningPaper[]) => void,
  ) => {
    return await runInTransaction(async (transaction) => {
      const ids = Array.isArray(planningId) ? planningId : [planningId];

      const planningPapers = await planningPaperRepository.getPapersById({
        planningIds: ids,
        options: {
          attributes: [
            "planningId",
            "runningPlan",
            "qtyProduced",
            "status",
            "orderId",
            "statusRequest",
          ],
        },
        transaction,
      });

      if (planningPapers.length !== ids.length) {
        throw AppError.BadRequest("Một hoặc nhiều planning không tồn tại", "PLANNING_NOT_FOUND");
      }

      // Thực thi validator riêng
      extraValidator(planningPapers);

      await planningHelper.updateDataModel({
        model: PlanningPaper,
        data: { status: targetStatus },
        options: { where: { planningId: ids }, transaction },
      });

      const overflowRows = await timeOverflowPlanning.findAll({
        where: { planningId: ids },
        transaction,
      });

      if (overflowRows.length > 0) {
        await planningHelper.updateDataModel({
          model: timeOverflowPlanning,
          data: { status: targetStatus },
          options: { where: { planningId: ids }, transaction },
        });
      }

      //--------------------MEILISEARCH-----------------------
      const dataForMeili = planningPapers.map((p) => ({
        planningId: p.planningId,
        status: targetStatus,
      }));

      await meiliService.syncOrUpdateMeiliData({
        indexKey: MEILI_INDEX.PLANNING_PAPERS,
        data: dataForMeili,
        transaction,
        isUpdate: true,
      });

      return { message: `Planning status updated to ${targetStatus}`, ids };
    });
  },

  pauseOrAcceptLackQtyPLanning: async (
    planningIds: number[],
    newStatus: string,
    rejectReason?: string,
  ) => {
    try {
      return await runInTransaction(async (transaction) => {
        const plannings = await planningPaperRepository.getPapersById({ planningIds, transaction });
        if (plannings.length === 0) {
          throw AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
        }

        if (newStatus !== "complete") {
          for (const planning of plannings) {
            if (planning.orderId) {
              const order = await planningHelper.getModelById({
                model: Order,
                where: { orderId: planning.orderId },
                options: { transaction },
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
                    options: { transaction },
                  });

                  // Trừ công nợ khách hàng
                  //thêm transaction vào đây
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
                    transaction,
                  );

                  for (const box of dependents) {
                    await planningHelper.deleteModelData({
                      model: PlanningBoxTime,
                      where: { planningBoxId: box.planningBoxId },
                      transaction,
                    });

                    await box.destroy({ transaction });
                  }

                  //xóa planning paper
                  const deletedId = planning.planningId;
                  await planning.destroy({ transaction });

                  //--------------------MEILISEARCH-----------------------
                  await meiliService.deleteMeiliData(
                    MEILI_INDEX.PLANNING_PAPERS,
                    deletedId,
                    transaction,
                  );
                  await meiliService.syncOrUpdateMeiliData({
                    indexKey: MEILI_INDEX.ORDERS,
                    data: { orderSortValue: order.orderSortValue, status: newStatus },
                    isUpdate: true,
                    transaction,
                  });
                }
                //case pause planning -> status:accept or stop order
                //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
                //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
                else if (newStatus === "stop") {
                  const dependents = await planningPaperRepository.getBoxByPlanningId(
                    planning.planningId,
                    transaction,
                  );

                  if ((planning.qtyProduced ?? 0) > 0) {
                    await planningHelper.updateDataModel({
                      model: order,
                      data: { status: newStatus, rejectReason: rejectReason },
                      options: { transaction },
                    });

                    await planningHelper.updateDataModel({
                      model: planning,
                      data: { status: newStatus },
                      options: { transaction },
                    });

                    for (const box of dependents) {
                      await planningHelper.updateDataModel({
                        model: PlanningBoxTime,
                        data: { status: newStatus },
                        options: { where: { planningBoxId: box.planningBoxId }, transaction },
                      });
                    }

                    //--------------------MEILISEARCH-----------------------
                    await meiliService.syncOrUpdateMeiliData({
                      indexKey: MEILI_INDEX.PLANNING_PAPERS,
                      data: { planningId: planning.planningId, status: newStatus },
                      transaction,
                      isUpdate: true,
                    });
                    await meiliService.syncOrUpdateMeiliData({
                      indexKey: MEILI_INDEX.ORDERS,
                      data: { orderSortValue: order.orderSortValue, status: newStatus },
                      transaction,
                      isUpdate: true,
                    });
                  } else {
                    await planningHelper.updateDataModel({
                      model: order,
                      data: { status: "accept" },
                      options: { transaction },
                    });

                    for (const box of dependents) {
                      await planningHelper.deleteModelData({
                        model: PlanningBoxTime,
                        where: { planningBoxId: box.planningBoxId },
                        transaction,
                      });

                      await box.destroy({ transaction });
                    }

                    const deletedId = planning.planningId;
                    await planning.destroy({ transaction });
                    await CacheManager.clear("orderAccept");

                    //--------------------MEILISEARCH-----------------------
                    await meiliService.deleteMeiliData(
                      MEILI_INDEX.PLANNING_PAPERS,
                      deletedId,
                      transaction,
                    );
                    await meiliService.syncOrUpdateMeiliData({
                      indexKey: MEILI_INDEX.ORDERS,
                      data: { orderSortValue: order.orderSortValue, status: "accept" },
                      transaction,
                      isUpdate: true,
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
            await planning.save({ transaction });

            if (planning.hasOverFlow) {
              await planningHelper.updateDataModel({
                model: timeOverflowPlanning,
                data: { status: newStatus },
                options: { where: { planningId: planning.planningId }, transaction },
              });
            }

            const planningBox = await planningHelper.getModelById({
              model: PlanningBox,
              where: {
                planningId: planning.planningId,
              },
              options: { transaction },
            });

            if (planningBox) {
              await planningHelper.updateDataModel({
                model: PlanningBoxTime,
                data: { runningPlan: planning.qtyProduced ?? 0 },
                options: { where: { planningBoxId: planningBox.planningBoxId }, transaction },
              });
            }

            //--------------------MEILISEARCH-----------------------
            await meiliService.syncOrUpdateMeiliData({
              indexKey: MEILI_INDEX.PLANNING_PAPERS,
              data: { planningId: planning.planningId, status: newStatus },
              transaction,
              isUpdate: true,
            });
          }
        }

        return { message: "Update status planning successfully" };
      });
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
          options: { transaction },
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

  exportExcelPlanningOrder: async (res: Response, machine: string) => {
    try {
      const data = await planningPaperRepository.getPaperToExportFile(machine);
      const finalData = planningPaperService.applyPlanningSortAndOverflow(data);

      const safeMachineName = machine.replace(/\s+/g, "-");

      await exportExcelResponse(res, {
        data: finalData,
        sheetName: "Kế hoạch sản xuất",
        fileName: `KHSX_${normalizeVN(safeMachineName)}`,
        columns: planningPaperColumns,
        rows: mapPlanningPaperRow,
      });
    } catch (error) {
      console.error("Error create inventory:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
