import dotenv from "dotenv";
dotenv.config();
import { Op } from "sequelize";
import redisCache from "../../configs/redisCache";
import { Customer } from "../../models/customer/customer";
import { Order } from "../../models/order/order";
import { machinePaperType, PlanningPaper } from "../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { AppError } from "../../utils/appError";
import { CacheManager } from "../../utils/helper/cacheManager";
import { planningRepository } from "../../repository/planningRepository";
import { WasteNormPaper } from "../../models/admin/wasteNormPaper";
import { WaveCrestCoefficient } from "../../models/admin/waveCrestCoefficient";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { MachinePaper } from "../../models/admin/machinePaper";
import { Request } from "express";
import { calculateTimeRunning, updateSortPlanning } from "./helper/timeRunningPaper";
import { machineMap } from "../../configs/machineLabels";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = CacheManager.keys.planning;
const { order } = CacheManager.keys.planning;

export const planningPaperService = {
  //====================================PLANNING ORDER========================================
  getOrderAccept: async () => {
    const cacheKey = order.all;

    try {
      const { isChanged: order } = await CacheManager.check(
        [{ model: Order, where: { status: "accept" } }],
        "planningOrder"
      );

      const { isChanged: planningPaper } = await CacheManager.check(
        [
          { model: PlanningPaper },
          { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
        ],
        "planningPaper",
        { setCache: false }
      );

      const isChangedData = order || planningPaper;

      if (isChangedData) {
        await CacheManager.clearOrderAccept();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          return { ...JSON.parse(cachedData), fromCache: true };
        }
      }

      const result = await planningRepository.getOrderAccept();
      const responseData = { message: "", data: result };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get all order accept failed:", error);
      throw AppError.ServerError();
    }
  },

  planningOrder: async (orderId: string, planningData: any) => {
    try {
      if (!orderId) {
        throw AppError.BadRequest("Missing orderId or newStatus", "MISSING_PARAMETERS");
      }

      // 1) Lấy thông tin Order kèm các quan hệ
      const order = await planningRepository.findOrderById(orderId);
      if (!order) throw AppError.NotFound("Order not found", "ORDER_NOT_FOUND");

      const { chooseMachine } = planningData;

      // 2) Lấy thông số định mức và hệ số sóng cho máy đã chọn
      const wasteNorm = await planningRepository.getModelById(WasteNormPaper, {
        machineName: chooseMachine,
      });
      const waveCoeff = await planningRepository.getModelById(WaveCrestCoefficient, {
        machineName: chooseMachine,
      });

      if (!wasteNorm || !waveCoeff) {
        throw new Error(
          `WasteNorm or WaveCrestCoefficient not found for machine: ${chooseMachine}`
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
        waveTypes: string[]
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

        const haoPhi =
          wasteNorm.waveCrestSoft > 0
            ? (runningPlan / numberChild) *
              (bottom / wasteNorm.waveCrestSoft) *
              (wasteNorm.lossInProcess / 100)
            : 0;

        const knife =
          wasteNorm.waveCrestSoft > 0
            ? (bottom / wasteNorm.waveCrestSoft) * wasteNorm.lossInSheetingAndSlitting
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
      const paperPlan = await planningRepository.createPlanning(PlanningPaper, {
        orderId,
        status: "planning",
        ...planningData,
      });

      // 7) Tính phế liệu và cập nhật lại plan giấy tấm
      const waste = calculateWaste(
        layers,
        planningData.ghepKho,
        wasteNorm,
        waveCoeff,
        planningData.runningPlan,
        order.numberChild,
        waveTypes
      );
      Object.assign(paperPlan, waste);
      await paperPlan.save();

      let boxPlan = null;

      // 8) Nếu đơn hàng có làm thùng, tạo thêm kế hoạch lam-thung (waiting)
      const box = order.box;
      if (order.isBox) {
        boxPlan = await planningRepository.createPlanning(PlanningBox, {
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
          await planningRepository.createPlanningBoxTime(machineTimes);
        }
      }

      return {
        message: "Đã tạo kế hoạch thành công.",
        planning: [paperPlan, boxPlan].filter(Boolean),
      };
    } catch (error) {
      console.error("planningOrder error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //====================================PLANNING PAPER========================================
  getPlanningByMachine: async (machine: string) => {
    try {
      if (!machine) {
        throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
      }

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
          //   return { ...JSON.parse(cachedData), fromCache: true };
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
      const data = await planningRepository.getPapersByMachine(machine);

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
      throw error;
    }
  },

  getPlanningByOrderId: async (machine: string, orderId: string) => {
    try {
      if (!machine || !orderId) {
        throw AppError.BadRequest("Missing orderId or machine parameter", "MISSING_PARAMETERS");
      }

      const cacheKey = paper.machine(machine);
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        if (devEnvironment) console.log("✅ Data planning from Redis");
        return {
          message: "Get planning by orderId from cache",
          data: JSON.parse(cachedData),
        };

        // return { ...JSON.parse(cachedData), fromCache: true };
      }

      const planning = await planningRepository.getPapersByOrderId(orderId);
      if (!planning || planning.length === 0) {
        throw AppError.NotFound(
          `Không tìm thấy kế hoạch với orderId chứa: ${orderId}`,
          "PLANNING_NOT_FOUND"
        );
      }

      return { message: "Get planning by orderId from db", data: planning };
    } catch (error) {
      console.error("❌ Lỗi khi tìm orderId:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  changeMachinePlanning: async (planningIds: number[], newMachine: machinePaperType) => {
    try {
      if (!Array.isArray(planningIds) || planningIds.length === 0) {
        throw AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
      }

      const plannings = await planningRepository.getPapersByPlanningId(planningIds);

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

  pauseOrAcceptLackQtyPLanning: async (
    planningIds: number[],
    newStatus: string,
    rejectReason?: string
  ) => {
    try {
      if (!Array.isArray(planningIds) || planningIds.length === 0) {
        throw AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
      }

      const plannings = await planningRepository.getPapersByPlanningId(planningIds);
      if (plannings.length === 0) {
        throw AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
      }

      if (newStatus !== "complete") {
        for (const planning of plannings) {
          if (planning.orderId) {
            const order = await planningRepository.getModelById(Order, {
              orderId: planning.orderId,
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
                await planningRepository.updateDataModel(order, {
                  status: newStatus,
                  rejectReason,
                });

                // Trừ công nợ khách hàng
                const customer = await planningRepository.getModelById(
                  Customer,
                  { customerId: order.customerId },
                  { attributes: ["customerId", "debtCurrent"] }
                );

                if (customer) {
                  let debtAfter = (customer.debtCurrent || 0) - order.totalPrice;
                  if (debtAfter < 0) debtAfter = 0; //tránh âm tiền

                  await planningRepository.updateDataModel(customer, { debtCurrent: debtAfter });
                }

                // Xoá dữ liệu phụ thuộc
                const dependents = await planningRepository.getBoxByPlanningId(planning.planningId);

                for (const box of dependents) {
                  await planningRepository.deleteModelData(PlanningBoxTime, {
                    planningBoxId: box.planningBoxId,
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
                  await planningRepository.updateDataModel(order, {
                    status: newStatus,
                    rejectReason: rejectReason,
                  });

                  await planningRepository.updateDataModel(planning, { status: newStatus });

                  for (const box of dependents) {
                    await planningRepository.updateDataModel(
                      PlanningBoxTime,
                      { status: newStatus },
                      { where: { planningBoxId: box.planningBoxId } }
                    );
                  }
                } else {
                  await planningRepository.updateDataModel(order, { status: "accept" });

                  for (const box of dependents) {
                    await planningRepository.deleteModelData(PlanningBoxTime, {
                      planningBoxId: box.planningBoxId,
                    });

                    await box.destroy();
                  }

                  //xóa planning paper
                  await planning.destroy();

                  //clear cache
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
            await planningRepository.updateDataModel(
              timeOverflowPlanning,
              { status: newStatus },
              { where: { planningId: planning.planningId } }
            );
          }

          const planningBox = await planningRepository.getModelById(PlanningBox, {
            planningId: planning.planningId,
          });
          if (!planningBox) {
            continue;
          }

          await planningRepository.updateDataModel(
            PlanningBoxTime,
            { runningPlan: planning.qtyProduced ?? 0 },
            { where: { planningBoxId: planningBox.planningBoxId } }
          );
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
  }: {
    req: Request;
    updateIndex: any[];
    machine: string;
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
  }) => {
    const transaction = await PlanningPaper.sequelize?.transaction();

    try {
      if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
        throw AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
      }

      // 1️⃣ Cập nhật sortPlanning
      await updateSortPlanning(updateIndex, transaction);

      // 2️⃣ Lấy lại danh sách đã update
      const plannings = await planningRepository.getPapersByUpdateIndex(updateIndex, transaction);

      // 3️⃣ Lấy thông tin máy
      const machineInfo = await planningRepository.getModelById(MachinePaper, {
        machineName: machine,
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
