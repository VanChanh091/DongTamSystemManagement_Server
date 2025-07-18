import Redis from "ioredis";
import ReportProduction from "../../../models/report/reportProduction";
import { report } from "process";
import Planning from "../../../models/planning/planning";
import Order from "../../../models/order/order";
import timeOverflowPlanning from "../../../models/planning/timeOverFlowPlanning";

const redisCache = new Redis();

//get all report production
export const getAllReportProd = async (req, res) => {
  try {
    const cacheKey = "reportProduction:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("✅ Data Report Production from Redis");
      return res.status(200).json({
        message: "Get all Report Production from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await ReportProduction.findAll();

    //fresh cache
    await redisCache.del(cacheKey);
    // Cache redis in 1 hour
    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    return res
      .status(200)
      .json({ message: "Get all report production successfully", data });
  } catch (error) {
    console.error("Error get all report production:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by shift production
export const getShiftProduction = async (req, res) => {
  const { shift } = req.query;

  if (!shift) {
    return res.status(400).json({ message: "Shift is required" });
  }
  try {
    const cacheKey = "reportProduction:all";
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter(
        (report) => report.shiftProduction === shift
      );

      if (filteredData.length > 0) {
        return res.status(200).json({
          message: `Get report production for ${shift} from cache`,
          data: filteredData,
        });
      }
    }

    const data = await ReportProduction.findAll({
      where: { shiftProduction: shift },
    });

    if (data.length === 0) {
      return res
        .status(404)
        .json({ message: "No report found for this shift" });
    }

    res.status(200).json({
      message: `Get report production for ${shift} successfully`,
      data,
    });
  } catch (error) {
    console.error("Error get Shift Production:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by orderId
export const getReportByOrderId = async (req, res) => {
  try {
  } catch (error) {
    console.error("Error get Report By OrderId:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//add report production & update status planning
export const addReportProduction = async (req, res) => {
  const { planningId } = req.query;
  const { ...reportData } = req.body;

  const transaction = await ReportProduction.sequelize.transaction();

  if (!planningId) {
    return res.status(400).json({ message: "Planning ID is required" });
  }
  try {
    //1. find planning by planningId
    const planning = await Planning.findOne({
      where: { planningId: planningId },
      include: [
        {
          model: Order,
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product },
            { model: Box, as: "box" },
          ],
        },
        { model: timeOverflowPlanning, as: "timeOverFlow" },
      ],
    });
    if (!planning) {
      return res.status(404).json({ message: "Planning not found" });
    }

    //2. create report production
    const newReport = await ReportProduction.create(
      {
        planningId,
        ...reportData,
      },
      { transaction }
    );

    //3. update status planning to 'complete'
    if (reportData.qtyActually >= planning.runningPlan) {
      await planning.update({ status: "complete" });
    }

    //4. delete cache
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
