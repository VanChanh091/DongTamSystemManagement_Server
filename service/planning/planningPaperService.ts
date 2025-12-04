import dotenv from "dotenv";
dotenv.config();
import { Op } from "sequelize";
import redisCache from "../../configs/redisCache";
import { Order } from "../../models/order/order";
import { machinePaperType, PlanningPaper } from "../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { AppError } from "../../utils/appError";
import { CacheManager } from "../../utils/helper/cacheManager";
import { planningRepository } from "../../repository/planningRepository";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { MachinePaper } from "../../models/admin/machinePaper";
import { Request } from "express";
import { calculateTimeRunning, updateSortPlanning } from "./helper/timeRunningPaper";
import { getPlanningByField } from "../../utils/helper/modelHelper/planningHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = CacheManager.keys.planning;

export const planningPaperService = {
  //====================================PLANNING PAPER========================================
  getPlanningByMachine: async (machine: string) => {
    try {
      const cacheKey = paper.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningPaper },
          { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
        ],
        "planningPaper"
      );

      if (isChanged) {
        await CacheManager.clearPlanningPaper();
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
      const data = await planningRepository.getPlanningPaper({
        whereCondition: {
          chooseMachine: machine,
          status: { [Op.ne]: "stop" },
        },
      });

      //lọc đơn complete trong 3 ngày
      const truncateToDate = (date: Date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const now = truncateToDate(new Date());

      const validData = data.filter((planning) => {
        if (["planning", "lackQty", "producing"].includes(planning.status)) return true;

        if (planning.status === "complete") {
          const dayCompleted = planning.dayCompleted ? new Date(planning.dayCompleted) : null;
          if (!dayCompleted || isNaN(dayCompleted.getTime())) return false;

          const expiredDate = truncateToDate(new Date(dayCompleted));
          expiredDate.setDate(expiredDate.getDate() + 3);

          return expiredDate >= now;
        }

        return false;
      });

      const withSort = validData.filter((item) => item.sortPlanning !== null);
      const noSort = validData.filter((item) => item.sortPlanning === null);

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

        const layerA = getLayer(a.Order.flute ?? "");
        const layerB = getLayer(b.Order.flute ?? "");
        if (layerB !== layerA) return layerB - layerA;

        const waveA = getWavePriorityList(a.Order.flute ?? "");
        const waveB = getWavePriorityList(b.Order.flute ?? "");
        const maxLength = Math.max(waveA.length, waveB.length);

        for (let i = 0; i < maxLength; i++) {
          const priA = waveA[i] ?? 0;
          const priB = waveB[i] ?? 0;
          if (priB !== priA) return priB - priA;
        }

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
              (item) => delete overflow.Order[item]
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
    // console.log(`machine ${machine} - field: ${field} - keyword: ${keyword}`);

    try {
      const fieldMap = {
        orderId: (paper: PlanningPaper) => paper.orderId,
        ghepKho: (paper: PlanningPaper) => paper.ghepKho,
        customerName: (paper: PlanningPaper) => paper.Order.Customer.customerName,
        flute: (paper: PlanningPaper) => paper.Order.flute,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!key || !fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      const result = await getPlanningByField({
        cacheKey: paper.search(machine),
        keyword,
        getFieldValue: fieldMap[key],
        whereCondition: { chooseMachine: machine, status: { [Op.ne]: "stop" } },
        message: `get all by ${field} from filtered cache`,
      });

      const planningIdsArr = result.data.map((p: any) => p.planningId);
      if (!planningIdsArr || planningIdsArr.length === 0) {
        return {
          ...result,
          data: [],
        };
      }

      const fullData = await planningRepository.getPlanningPaper({
        whereCondition: { planningId: planningIdsArr },
      });

      return { ...result, data: fullData };
      // return result;
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  changeMachinePlanning: async (planningIds: number[], newMachine: machinePaperType) => {
    try {
      const plannings = await planningRepository.getPapersById({ planningIds });

      if (plannings.length === 0) {
        throw AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
      }

      for (const planning of plannings) {
        planning.chooseMachine = newMachine;
        planning.sortPlanning = null;
        await planning.save();
      }

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

      const plannings = await planningRepository.getStopByIds(ids);
      if (plannings.length == 0) {
        throw AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
      }

      const planningPaper = await planningRepository.getPapersById({
        planningIds: ids,
        options: {
          attributes: ["planningId", "runningPlan", "qtyProduced", "status", "hasOverFlow"],
        },
      });

      // Kiểm tra từng đơn
      for (const paper of planningPaper) {
        const { qtyProduced, runningPlan } = paper;

        if ((qtyProduced ?? 0) < runningPlan) {
          throw AppError.BadRequest("Lack quantity", "LACK_QUANTITY");
        }
      }

      await planningRepository.updateDataModel({
        model: PlanningPaper,
        data: { status: "complete" },
        options: { where: { planningId: ids } },
      });

      const overflowRows = await timeOverflowPlanning.findAll({
        where: { planningId: ids },
      });

      if (overflowRows.length) {
        await planningRepository.updateDataModel({
          model: timeOverflowPlanning,
          data: { status: "complete" },
          options: { where: { planningId: ids } },
        });
      }

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
    rejectReason?: string
  ) => {
    try {
      const plannings = await planningRepository.getPapersById({ planningIds });
      if (plannings.length === 0) {
        throw AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
      }

      if (newStatus !== "complete") {
        for (const planning of plannings) {
          if (planning.orderId) {
            const order = await planningRepository.getModelById({
              model: Order,
              where: { orderId: planning.orderId },
            });

            if (order) {
              //case: cancel planning -> status:reject order
              //if qtyProduced = 0 -> status:reject order -> delete planning paper&box -> minus debt of customer
              if (newStatus === "reject") {
                if ((planning.qtyProduced ?? 0) > 0) {
                  throw AppError.Conflict(
                    `Cannot reject planning ${planning.planningId} with produced quantity.`,
                    "CANNOT_REJECT_PRODUCED_PLANNING"
                  );
                }

                // Trả order về reject
                await planningRepository.updateDataModel({
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
                const dependents = await planningRepository.getBoxByPlanningId(planning.planningId);

                for (const box of dependents) {
                  await planningRepository.deleteModelData({
                    model: PlanningBoxTime,
                    where: { planningBoxId: box.planningBoxId },
                  });

                  await box.destroy();
                }

                //xóa planning paper
                await planning.destroy();
              }
              //case pause planning -> status:accept or stop order
              //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
              //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
              else if (newStatus === "stop") {
                const dependents = await planningRepository.getBoxByPlanningId(planning.planningId);

                if ((planning.qtyProduced ?? 0) > 0) {
                  await planningRepository.updateDataModel({
                    model: order,
                    data: {
                      status: newStatus,
                      rejectReason: rejectReason,
                    },
                  });

                  await planningRepository.updateDataModel({
                    model: planning,
                    data: { status: newStatus },
                  });

                  for (const box of dependents) {
                    await planningRepository.updateDataModel({
                      model: PlanningBoxTime,
                      data: { status: newStatus },
                      options: { where: { planningBoxId: box.planningBoxId } },
                    });
                  }
                } else {
                  await planningRepository.updateDataModel({
                    model: order,
                    data: { status: "accept" },
                  });

                  for (const box of dependents) {
                    await planningRepository.deleteModelData({
                      model: PlanningBoxTime,
                      where: { planningBoxId: box.planningBoxId },
                    });

                    await box.destroy();
                  }

                  await planning.destroy();
                  await CacheManager.clearOrderAccept();
                }
              }
            }
          }
        }
      } else {
        // complete -> accept lack of qty
        for (const planning of plannings) {
          if (planning.sortPlanning === null) {
            throw AppError.BadRequest("Cannot pause planning without sortPlanning", "BAD_REQUEST");
          }

          planning.status = newStatus;
          await planning.save();

          if (planning.hasOverFlow) {
            await planningRepository.updateDataModel({
              model: timeOverflowPlanning,
              data: { status: newStatus },
              options: { where: { planningId: planning.planningId } },
            });
          }

          const planningBox = await planningRepository.getModelById({
            model: PlanningBox,
            where: {
              planningId: planning.planningId,
            },
          });
          if (!planningBox) {
            continue;
          }

          await planningRepository.updateDataModel({
            model: PlanningBoxTime,
            data: { runningPlan: planning.qtyProduced ?? 0 },
            options: { where: { planningBoxId: planningBox.planningBoxId } },
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
    req,
    updateIndex,
    machine,
    dayStart,
    timeStart,
    totalTimeWorking,
    isNewDay,
  }: {
    req: Request;
    updateIndex: any[];
    machine: string;
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
    isNewDay: boolean;
  }) => {
    const transaction = await PlanningPaper.sequelize?.transaction();

    try {
      // 1️⃣ Cập nhật sortPlanning
      await updateSortPlanning(updateIndex, transaction);

      // 2️⃣ Lấy lại danh sách đã update
      const plannings = await planningRepository.getPapersByUpdateIndex(updateIndex, transaction);

      // console.log(plannings.map((p) => ({ id: p.planningId, sort: p?.sortPlanning })));

      // 3️⃣ Lấy thông tin máy
      const machineInfo = await planningRepository.getModelById({
        model: MachinePaper,
        where: { machineName: machine },
      });
      if (!machineInfo) throw new Error("Machine not found");

      // 4️⃣ Tính toán thời gian chạy
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

      await transaction?.commit();

      // 5️⃣ Phát socket
      const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
      req.io?.to(roomName).emit("planningPaperUpdated", {
        machine,
        message: `Kế hoạch của ${machine} đã được cập nhật.`,
      });

      return {
        message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
        data: updatedPlannings,
      };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌Lỗi khi cập nhật và tính toán thời gian:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
