import Redis from "ioredis";
import { Op } from "sequelize";
import { machineLabels } from "../../../configs/machineLabels.js";
import PlanningPaper from "../../../models/planning/planningPaper.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import Order from "../../../models/order/order.js";
import PlanningBox from "../../../models/planning/planningBox.js";
import planningBoxMachineTime from "../../../models/planning/planningBoxMachineTime.js";
import ReportPlanningPaper from "../../../models/report/reportPlanningPaper.js";
import ReportPlanningBox from "../../../models/report/reportPlanningBox.js";
import { createReportPlanning } from "../../../utils/helper/reportHelper.js";

const redisCache = new Redis();

//===============================MANUFACTURE PAPER=====================================

//get planning machine paper
export const getPlanningPaper = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res.status(400).json({ message: "Missing machine query parameter" });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;

    // refresh cache
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      let cachedPlannings = JSON.parse(cachedData);

      const filtered = cachedPlannings.filter((item) => {
        const matchStatus = ["planning", "lackQty", "producing"].includes(item.status);
        const hasDayStart = item.dayStart !== null;
        return matchStatus && hasDayStart;
      });

      return res.json({
        message: `get filtered cache planning:machine:${machine}`,
        data: filtered,
      });
    }

    const planning = await PlanningPaper.findAll({
      where: { chooseMachine: machine, dayStart: { [Op.ne]: null } },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Order,
          attributes: {
            exclude: [
              "acreage",
              "dvt",
              "price",
              "pricePaper",
              "discount",
              "profit",
              "vat",
              "rejectReason",
              "createdAt",
              "updatedAt",
              "lengthPaperCustomer",
              "paperSizeCustomer",
              "quantityCustomer",
            ],
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
        },
      ],
      order: [["sortPlanning", "ASC"]],
    });

    // Lọc đơn complete chỉ giữ lại trong 1 ngày
    const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const now = truncateToDate(new Date());

    const validData = planning.filter((item) => {
      if (["planning", "lackQty", "producing"].includes(item.status)) return true;

      if (item.status === "complete") {
        const dayCompleted = new Date(item.dayCompleted);
        if (isNaN(dayCompleted)) return false;

        const expiredDate = truncateToDate(new Date(dayCompleted));
        expiredDate.setDate(expiredDate.getDate() + 1);

        return expiredDate >= now;
      }
      return false;
    });

    const allPlannings = [];
    validData.forEach((planning) => {
      const original = {
        ...planning.toJSON(),
        timeRunning: planning.timeRunning,
        dayStart: planning.dayStart,
      };
      allPlannings.push(original);

      if (planning.timeOverFlow) {
        const overflowDayStart = planning.timeOverFlow.overflowDayStart;
        const overflowTime = planning.timeOverFlow.overflowTimeRunning;
        const dayCompletedOverflow = planning.timeOverFlow.overflowDayCompleted;

        allPlannings.push({
          ...original,
          dayStart: overflowDayStart,
          dayCompleted: dayCompletedOverflow,
          timeRunning: overflowTime,
        });
      }
    });

    await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);

    res.status(200).json({
      message: `get planning paper by machine: ${machine}`,
      data: allPlannings,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//create report for machine
export const addReportPaper = async (req, res) => {
  const { planningId } = req.query;
  const { qtyProduced, qtyWasteNorm, dayCompleted, ...otherData } = req.body;
  const { role, permissions: userPermissions } = req.user;

  if (!planningId || !qtyProduced || !dayCompleted || !qtyWasteNorm) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const transaction = await PlanningPaper.sequelize.transaction();
  try {
    // 1. Tìm kế hoạch hiện tại
    const planning = await PlanningPaper.findOne({
      where: { planningId },
      include: [{ model: timeOverflowPlanning, as: "timeOverFlow" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!planning) {
      await transaction.rollback();
      return res.status(404).json({ message: "Planning not found" });
    }

    const machine = planning.chooseMachine;
    const machineLabel = machineLabels[machine];

    //check permission for machine
    if (role !== "admin" && role !== "manager") {
      if (!userPermissions.includes(machineLabel)) {
        await transaction.rollback();
        return res.status(403).json({
          message: `Access denied: You don't have permission to report for machine ${machine}`,
        });
      }
    }

    // 2. Cộng dồn số lượng mới vào số đã có
    const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
    const newQtyWasteNorm = Number(planning.qtyWasteNorm || 0) + Number(qtyWasteNorm || 0);

    const isOverflowReport =
      planning.hasOverFlow &&
      planning.timeOverFlow &&
      new Date(dayCompleted) >= new Date(planning.timeOverFlow.overflowDayStart);

    let overflow, dayReportValue;

    //get timeOverflowPlanning
    if (planning.hasOverFlow) {
      overflow = await timeOverflowPlanning.findOne({
        where: { planningId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!overflow) {
        await transaction.rollback();
        return res.status(404).json({ message: "Overflow plan not found" });
      }
    }

    if (isOverflowReport) {
      await overflow.update({ overflowDayCompleted: new Date(dayCompleted) }, { transaction });

      await planning.update(
        {
          qtyProduced: newQtyProduced,
          qtyWasteNorm: newQtyWasteNorm,
          ...otherData,
        },
        { transaction }
      );

      dayReportValue = overflow.getDataValue("overflowDayCompleted");
    } else {
      await planning.update(
        {
          qtyProduced: newQtyProduced,
          qtyWasteNorm: newQtyWasteNorm,
          dayCompleted: new Date(dayCompleted),
          ...otherData,
        },
        { transaction }
      );

      dayReportValue = planning.getDataValue("dayCompleted");
    }

    //compare qtyProduced vs runningPlan
    if (newQtyProduced >= planning.runningPlan) {
      await planning.update({ status: "complete" }, { transaction });
      if (isOverflowReport) {
        await overflow.update({ status: "complete" }, { transaction });
      }
    } else {
      await planning.update({ status: "lackQty" }, { transaction });
    }

    //3. tạo report theo số lần báo cáo
    await createReportPlanning({
      planning: planning.toJSON(),
      model: ReportPlanningPaper,
      qtyProduced,
      qtyWasteNorm,
      dayReportValue,
      otherData,
      transaction,
    });

    // 4. Kiểm tra đã đủ sản lượng chưa
    if (newQtyProduced >= planning.runningPlan) {
      //Cập nhật số lượng cho planning box
      const planningBox = await PlanningBox.findOne({ where: { planningId } });
      if (!planningBox) {
        await transaction.rollback();
        return res.status(404).json({ message: "PlanningBox not found" });
      }

      await planningBox.update({ runningPlan: newQtyProduced }, { transaction });
    }

    //5. Commit + clear cache
    await transaction.commit();
    await redisCache.del(`planning:machine:${machine}`);

    res.status(200).json({
      message: "Add Report Production successfully",
      data: {
        planningId,
        qtyProduced: newQtyProduced,
        qtyWasteNorm: newQtyWasteNorm,
        dayCompleted,
        ...otherData,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error add Report Production:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//confirm producing paper
export const confirmProducingPaper = async (req, res) => {
  const { planningId } = req.query;
  const { role, permissions: userPermissions } = req.user;

  if (!planningId) {
    return res.status(400).json({ message: "Missing planningId query parameter" });
  }

  const transaction = await PlanningPaper.sequelize.transaction();
  try {
    const planning = await PlanningPaper.findOne({
      where: { planningId },
      transaction,
      lock: transaction.LOCK.UPDATE, // lock để tránh race condition
    });
    if (!planning) {
      return res.status(404).json({ message: "Planning not found" });
    }

    // check permission
    const machine = planning.chooseMachine;
    const machineLabel = machineLabels[machine];

    if (role !== "admin" && role !== "manager") {
      if (!userPermissions.includes(machineLabel)) {
        await transaction.rollback();
        return res.status(403).json({
          message: `Access denied: You don't have permission to report for machine ${machine}`,
        });
      }
    }

    // Check if the planning is already completed
    if (planning.status === "complete") {
      return res.status(400).json({ message: "Planning already completed" });
    }

    // Check if there's another planning in 'producing' status for the same machine
    const existingProducing = await PlanningPaper.findOne({
      where: { chooseMachine: machine, status: "producing" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingProducing && existingProducing.planningId !== planningId) {
      await existingProducing.update({ status: "planning" }, { transaction });
    }

    await planning.update({ status: "producing" }, { transaction });

    //clear cache
    await transaction.commit();
    await redisCache.del(`planning:machine:${machine}`);

    res.status(200).json({
      message: "Confirm producing paper successfully",
      data: planning,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error confirming producing paper:", error);
    res.status(400).json({ message: "Server error" });
  }
};

//===============================MANUFACTURE BOX=====================================

//get all planning box
export const getPlanningBox = async (req, res) => {
  const { machine, refresh = false } = req.query;

  if (!machine) {
    return res.status(400).json({ message: "Missing 'machine' query parameter" });
  }

  try {
    const cacheKey = `planning:box:machine:${machine}`;

    // refresh cache
    if (refresh === "true") {
      await redisCache.del(cacheKey);
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      let cachedPlannings = JSON.parse(cachedData);

      const filtered = cachedPlannings.filter((item) => {
        const hasValidStatus = item.boxTimes.some((boxTimes) =>
          ["planning", "lackOfQty", "producing"].includes(boxTimes.status)
        );
        const hasDayStart = item.dayStart !== null;

        return hasValidStatus && hasDayStart;
      });

      return res.json({
        message: `get filtered cached planning:box:machine:${machine}`,
        data: filtered,
      });
    }

    const planning = await PlanningBox.findAll({
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
          model: planningBoxMachineTime,
          where: { machine: machine, dayStart: { [Op.ne]: null } },
          as: "boxTimes",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: planningBoxMachineTime,
          as: "allBoxTimes",
          where: {
            machine: { [Op.ne]: machine },
          },
          attributes: {
            exclude: [
              "timeRunning",
              "dayStart",
              "dayCompleted",
              "wasteBox",
              "shiftManagement",
              "status",
              "sortPlanning",
              "rpWasteLoss",
              "createdAt",
              "updatedAt",
            ],
          },
        },
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          required: false,
          where: { machine: machine },
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "numberChild",
            "dateRequestShipping",
            "customerId",
            "productId",
            "quantityCustomer",
          ],
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
            },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
        },
      ],
      order: [[{ model: planningBoxMachineTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
    });

    //lọc đơn complete trong 1 ngày
    const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const now = truncateToDate(new Date());

    const validData = planning.filter((planning) => {
      const boxTimes = planning.boxTimes || [];

      const hasValidStatus = boxTimes.some((bt) =>
        ["planning", "lackOfQty", "producing"].includes(bt.status)
      );

      const hasRecentComplete = boxTimes.some((bt) => {
        if (bt.status !== "complete" || !bt.dayCompleted) return false;

        const dayCompleted = new Date(bt.dayCompleted);
        if (isNaN(dayCompleted)) return false;

        const expiredDate = truncateToDate(dayCompleted);
        expiredDate.setDate(expiredDate.getDate() + 1);

        return expiredDate >= now;
      });

      return hasValidStatus || hasRecentComplete;
    });

    const allPlannings = [];

    validData.forEach((planning) => {
      const original = {
        ...planning.toJSON(),
        dayStart: planning.dayStart,
      };

      // Chỉ push nếu dayStart khác null
      if (original.dayStart !== null) {
        allPlannings.push(original);
      }

      if (planning.timeOverFlow && planning.timeOverFlow.length > 0) {
        planning.timeOverFlow.forEach((of) => {
          const overflowPlanning = {
            ...original,
            boxTimes: (planning.boxTimes || []).map((bt) => ({
              ...bt.dataValues,
              dayStart: of.overflowDayStart,
              dayCompleted: of.overflowDayCompleted,
              timeRunning: of.overflowTimeRunning,
            })),
          };
          allPlannings.push(overflowPlanning);
        });
      }

      return allPlannings;
    });

    await redisCache.set(cacheKey, JSON.stringify(allPlannings), "EX", 1800);

    return res.status(200).json({
      message: `get planning by machine: ${machine}`,
      data: allPlannings,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//create report for machine
export const addReportBox = async (req, res) => {
  const { planningBoxId, machine } = req.query;
  const { qtyProduced, rpWasteLoss, dayCompleted, shiftManagement } = req.body;

  if (!planningBoxId || !qtyProduced || !dayCompleted || !rpWasteLoss || !shiftManagement) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const transaction = await planningBoxMachineTime.sequelize.transaction();
  try {
    // 1. Tìm kế hoạch hiện tại
    const planning = await planningBoxMachineTime.findOne({
      where: { planningBoxId, machine: machine },
      include: [
        {
          model: PlanningBox,
          include: [{ model: timeOverflowPlanning, as: "timeOverFlow" }],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!planning) {
      await transaction.rollback();
      return res.status(404).json({ message: "Planning not found" });
    }

    // 2. Cộng dồn số lượng mới vào số đã có
    const newQtyProduced = Number(planning.qtyProduced || 0) + Number(qtyProduced || 0);
    const newQtyWasteNorm = Number(planning.rpWasteLoss || 0) + Number(rpWasteLoss || 0);

    const timeOverFlow =
      Array.isArray(planning.PlanningBox.timeOverFlow) &&
      planning.PlanningBox.timeOverFlow.length > 0
        ? planning.PlanningBox.timeOverFlow[0]
        : planning.PlanningBox.timeOverFlow;

    //condition
    const isOverflowReport =
      planning.PlanningBox.hasOverFlow &&
      planning.PlanningBox.timeOverFlow &&
      new Date(dayCompleted) >= new Date(timeOverFlow.overflowDayStart);

    let overflow, dayReportValue;

    //get timeOverflowPlanning
    if (planning.PlanningBox.hasOverFlow) {
      overflow = await timeOverflowPlanning.findOne({
        where: { planningBoxId, machine },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!overflow) {
        await transaction.rollback();
        return res.status(404).json({ message: "Overflow plan not found" });
      }
    }

    if (isOverflowReport) {
      await overflow.update({ overflowDayCompleted: new Date(dayCompleted) }, { transaction });

      await planning.update(
        {
          qtyProduced: newQtyProduced,
          rpWasteLoss: newQtyWasteNorm,
          shiftManagement: shiftManagement,
        },
        { transaction }
      );

      dayReportValue = overflow.getDataValue("overflowDayCompleted");
    } else {
      //Cập nhật kế hoạch với số liệu mới
      await planning.update(
        {
          dayCompleted: new Date(dayCompleted),
          qtyProduced: newQtyProduced,
          rpWasteLoss: newQtyWasteNorm,
          shiftManagement: shiftManagement,
        },
        { transaction }
      );

      dayReportValue = planning.getDataValue("dayCompleted");
    }

    //compare qtyProduced vs runningPlan
    const runningPlan = planning.PlanningBox.runningPlan || 0;

    if (newQtyProduced >= runningPlan) {
      await planning.update({ status: "complete" }, { transaction });
      if (isOverflowReport) {
        await overflow.update({ status: "complete" }, { transaction });
      }
    } else {
      await planning.update({ status: "lackOfQty" }, { transaction });
    }

    // 3. tạo report theo số lần báo cáo
    await createReportPlanning({
      planning: planning.toJSON(),
      model: ReportPlanningBox,
      qtyProduced: qtyProduced,
      qtyWasteNorm: rpWasteLoss,
      dayReportValue: dayReportValue,
      shiftManagementBox: shiftManagement,
      transaction,
      isBox: true,
    });

    // 4. Commit + clear cache
    await transaction.commit();
    await redisCache.del(`planning:box:machine:${machine}`);

    res.status(200).json({
      message: "Add Report Production successfully",
      data: {
        planningBoxId,
        machine,
        qtyProduced: newQtyProduced,
        qtyWasteNorm: newQtyWasteNorm,
        dayCompleted,
        shiftManagement,
        status: newQtyProduced >= runningPlan ? "complete" : "lackQty",
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error add Report Production:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//confirm producing box
export const confirmProducingBox = async (req, res) => {
  const { planningBoxId, machine } = req.query;
  const { role, permissions: userPermissions } = req.user;

  if (!planningBoxId) {
    return res.status(400).json({ message: "Missing planningBoxId query parameter" });
  }

  const transaction = await PlanningBox.sequelize.transaction();
  try {
    // Lấy planning cần update
    const planning = await planningBoxMachineTime.findOne({
      where: { planningBoxId, machine },
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true,
    });

    if (!planning) {
      await transaction.rollback();
      return res.status(404).json({ message: "Planning not found" });
    }

    // check permission
    const machineLabel = machineLabels[machine];
    if (role !== "admin" && role !== "manager") {
      if (!userPermissions.includes(machineLabel)) {
        await transaction.rollback();
        return res.status(403).json({
          message: `Access denied: You don't have permission to report for machine ${machine}`,
        });
      }
    }

    // Check if already complete
    if (planning.status === "complete") {
      await transaction.rollback();
      return res.status(400).json({ message: "Planning already completed" });
    }

    // Reset những thằng đang "producing"
    await planningBoxMachineTime.update(
      { status: "planning" },
      {
        where: {
          machine,
          status: "producing",
          planningBoxId: { [Op.ne]: planningBoxId },
        },
        transaction,
      }
    );

    // Update sang producing
    await planning.update({ status: "producing" }, { transaction });

    await transaction.commit();

    // Clear cache sau khi commit
    await redisCache.del(`planning:box:machine:${machine}`);

    return res.status(200).json({
      message: "Confirm producing box successfully",
      data: planning,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error confirming producing box:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
