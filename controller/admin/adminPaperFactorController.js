import Redis from "ioredis";
import PaperFactor from "../../models/admin/paperFactor.js";

const redisCache = new Redis();

// Get all paper factors
export const getAllPaperFactors = async (req, res) => {
  try {
    const cacheKey = "paperFactors:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Paper Factors from Redis");
      return res.status(200).json({
        message: "Get all paper factors from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await PaperFactor.findAll();

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 3600);

    res.json({
      message: "Get all paper factors successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching paper factors:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCoefficient = async (req, res) => {
  const { layerType, paperType } = req.body;
  try {
    const data = await PaperFactor.findOne({
      where: {
        layerType: layerType,
        paperType: paperType,
      },
    });

    if (!data) {
      res.status(404).json({ message: "PaperFactor not found!" });
    }

    res.status(201).json({ message: "getCoefficient successfully ", data });
  } catch (error) {
    console.error("Error fetching paper factors:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a new paper factor
export const addPaperFactor = async (req, res) => {
  const {
    layerType,
    paperType,
    rollLossPercent,
    processLossPercent,
    coefficient,
  } = req.body;

  try {
    const newPaperFactor = await PaperFactor.create({
      layerType,
      paperType,
      rollLossPercent,
      processLossPercent,
      coefficient,
    });

    // Clear cache after adding a new paper factor
    await redisCache.del("paperFactors:all");

    res.status(201).json({
      message: "Paper factor added successfully",
      data: newPaperFactor,
    });
  } catch (error) {
    console.error("Error adding paper factor:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update an existing paper factor
export const updatePaperFactor = async (req, res) => {
  const { id } = req.query;
  const {
    layerType,
    paperType,
    rollLossPercent,
    processLossPercent,
    coefficient,
  } = req.body;

  try {
    const paperFactor = await PaperFactor.findByPk(id);
    if (!paperFactor) {
      return res.status(404).json({ message: "Paper factor not found" });
    }

    await paperFactor.update({
      layerType,
      paperType,
      rollLossPercent,
      processLossPercent,
      coefficient,
    });

    // Clear cache after updating a paper factor
    await redisCache.del("paperFactors:all");

    res.json({
      message: "Paper factor updated successfully",
      data: paperFactor,
    });
  } catch (error) {
    console.error("Error updating paper factor:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a paper factor
export const deletePaperFactor = async (req, res) => {
  const { id } = req.query;

  try {
    if (!id) {
      return res.status(400).json({ message: "Missing ID in request" });
    }

    const deletedCount = await PaperFactor.destroy({
      where: { paperFactorId: id },
    });
    if (deletedCount === 0) {
      return res.status(404).json({ message: "Paper factor not found" });
    }

    // Clear cache after deleting a paper factor
    await redisCache.del("paperFactors:all");

    res.json({ message: "Paper factor deleted successfully" });
  } catch (error) {
    console.error("Error deleting paper factor:", error);
    res.status(500).json({ message: "Server error" });
  }
};
