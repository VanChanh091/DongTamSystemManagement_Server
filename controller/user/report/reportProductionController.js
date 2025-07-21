import Redis from "ioredis";
import ReportProduction from "../../../models/report/reportProduction.js";
import Planning from "../../../models/planning/planning.js";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning.js";
import { Op } from "sequelize";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";

const redisCache = new Redis();

//get all report production
export const getReportProdByMachine = async (req, res) => {
  const { machine } = req.query;

  if (!machine) {
    return res
      .status(400)
      .json({ message: "Missing 'machine' query parameter" });
  }

  try {
    const cacheKey = `reportProduction:machine:${machine}`;
    //refresh cache
    await redisCache.del(cacheKey);

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Report Production from Redis");
      return res.status(200).json({
        message: "Get machine of report production from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await ReportProduction.findAll({
      include: [
        {
          model: Planning,
          where: { chooseMachine: machine },
          include: [
            {
              model: Order,
              attributes: ["dayReceiveOrder"],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
    });

    // Cache redis in 1 hour
    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    return res
      .status(200)
      .json({ message: "Get machine of report production successfully", data });
  } catch (error) {
    console.error("Error get machine of report production:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by shift management
export const getReportByShiftManagement = async (req, res) => {
  const { name, machine } = req.query;

  if (!name || !machine) {
    return res.status(400).json({ message: "Shift or Machine is required" });
  }

  try {
    const cacheKey = `reportProduction:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter((report) =>
        report.shiftManagement?.toLowerCase().includes(name.toLowerCase())
      );

      return res.status(200).json({
        message: `Get report production for ${name} from cache`,
        data: filteredData,
      });
    }

    const data = await ReportProduction.findAll({
      include: [{ model: Planning, where: { chooseMachine: machine } }],
      where: {
        shiftManagement: {
          [Op.like]: `%${name}%`,
        },
      },
    });

    if (data.length === 0) {
      return res
        .status(404)
        .json({ message: "No report found for this shift" });
    }

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    res.status(200).json({
      message: `Get report shift management successfully`,
      data,
    });
  } catch (error) {
    console.error("Error get Report By Shift Management:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by day completed
export const getReportByDayCompleted = async (req, res) => {
  const { fromDate, toDate, machine } = req.query;

  if (!fromDate || !toDate || !machine) {
    return res
      .status(400)
      .json({ message: "fromDate and toDate || machine are required" });
  }

  try {
    const cacheKey = `reportProduction:machine:${machine}`;
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter((report) => {
        const reportDate = new Date(report.dayCompleted);
        return (
          reportDate >= new Date(fromDate) && reportDate <= new Date(toDate)
        );
      });

      return res.status(200).json({
        message: `Get report production from cache for range ${fromDate} to ${toDate}`,
        data: filteredData,
      });
    }

    const reports = await ReportProduction.findAll({
      include: [{ model: Planning, where: { chooseMachine: machine } }],
      where: {
        dayCompleted: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
      },
    });

    if (!reports || reports.length === 0) {
      return res
        .status(404)
        .json({ message: "No reports found in date range" });
    }

    await redisCache.set(cacheKey, JSON.stringify(reports), "EX", 1800);

    res.status(200).json({
      message: `Get Report Production from ${fromDate} to ${toDate} successfully`,
      data: reports,
    });
  } catch (error) {
    console.error("Error get Report By date range:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//add report production & update status planning
export const addReportProduction = async (req, res) => {
  const { planningId } = req.query;
  const { qtyActually, qtyWasteNorm, dayCompleted, ...otherData } = req.body;

  if (!planningId) {
    return res.status(400).json({ message: "Planning ID is required" });
  }

  const transaction = await ReportProduction.sequelize.transaction();
  try {
    // 1. Lấy planning (và overflow) trong transaction
    const planning = await Planning.findOne({
      where: { planningId },
      include: [{ model: timeOverflowPlanning, as: "timeOverFlow" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!planning) {
      await transaction.rollback();
      return res.status(404).json({ message: "Planning not found" });
    }

    // 2. Lấy tất cả các báo cáo trước đó để tính tổng
    const previousReports = await ReportProduction.findAll({
      where: { planningId },
      attributes: ["qtyActually", "qtyWasteNorm"],
      transaction,
    });

    const totalQtyBefore = previousReports.reduce(
      (sum, r) => sum + Number(r.qtyActually || 0),
      0
    );

    const totalQtyWasteNorm = previousReports.reduce(
      (sum, r) => sum + Number(r.qtyWasteNorm || 0),
      0
    );

    const totalQty = totalQtyBefore + Number(qtyActually);
    const totalWasteNorm = totalQtyWasteNorm + Number(qtyWasteNorm);

    // 3. Xử lý ghi chú
    const notes = [];

    // Thiếu / vượt / đúng số lượng
    if (totalQty < planning.runningPlan) {
      notes.push("Thiếu số lượng");
    } else if (totalQty > planning.runningPlan) {
      notes.push("Vượt số lượng");
    }

    // Phế liệu vượt định mức
    if (totalWasteNorm > planning.totalLoss) {
      notes.push("Vượt định mức phế liệu");
    }

    // Trễ kế hoạch
    const completedDate = new Date(dayCompleted);
    const planDate = planning.hasOverFlow
      ? new Date(planning.timeOverFlow?.overflowDayStart)
      : new Date(planning.dayStart);

    if (completedDate > planDate) {
      notes.push("Trễ kế hoạch");
    }

    // 4. Tạo báo cáo mới (cập nhật qtyActually hôm nay, nhưng note dựa vào tổng)
    const newReport = await ReportProduction.create(
      {
        planningId,
        qtyActually,
        qtyWasteNorm,
        dayCompleted,
        note: notes.join(", "),
        ...otherData,
      },
      { transaction }
    );

    // 5. Cập nhật trạng thái planning
    if (totalQty >= planning.runningPlan) {
      await planning.update(
        { status: "complete", sortPlanning: null },
        { transaction }
      );

      if (planning.hasOverFlow) {
        await timeOverflowPlanning.update(
          { status: "complete", sortPlanning: null },
          { where: { planningId }, transaction }
        );
      }
    } else {
      await planning.update({ status: "lackQty" }, { transaction });
    }

    // 6. Commit + clear cache
    await transaction.commit();
    await redisCache.del("reportProduction:all");

    res.status(201).json({
      message: "Add Report Production successfully",
      data: newReport,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error add Report Production:", error);
    res.status(500).json({ message: "Server error" });
  }
};
