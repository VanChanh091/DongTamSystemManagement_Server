import Redis from "ioredis";
import WasteNorm from "../../models/admin/wasteNorm.js";

const redisCache = new Redis();

//get all
export const getAllWasteNorm = async (req, res) => {
  try {
    const cacheKey = "wasteNorm:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data waste norm from Redis");
      return res.status(200).json({
        message: "Get all waste norm from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await WasteNorm.findAll();

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error) {
    console.error("failed to get all waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get waste norm by id
//use to get id for update
export const getWasteNormById = async (req, res) => {
  const { wasterNormId } = req.query;
  try {
    const cacheKey = "wasteNorm:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data waste norm from Redis");
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter(
        (item) => item.wasteNormId == wasterNormId
      );
      return res.status(200).json({
        message: "Get all waste norm from cache",
        data: filteredData,
      });
    }

    const wasteNorm = await WasteNorm.findByPk(wasterNormId);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    return res.status(200).json({
      message: `get waste norm by wasteNormId:${wasterNormId}`,
      data: wasteNorm,
    });
  } catch (error) {
    console.error(
      `failed to get waste norm by wasteNormId:${wasterNormId}`,
      error.message
    );
    res.status(500).json({ message: "server error" });
  }
};

//add waste norm
export const createWasteNorm = async (req, res) => {
  const { ...wasteNorm } = req.body;

  const transaction = await WasteNorm.sequelize.transaction();
  try {
    const newWasteNorm = await WasteNorm.create(
      { ...wasteNorm },
      { transaction }
    );

    await transaction.commit();
    await redisCache.del("wasteNorm:all");

    res
      .status(200)
      .json({ message: "create machine successfully", data: newWasteNorm });
  } catch (error) {
    console.error("failed to create waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update waste norm
export const updateWasteNormById = async (req, res) => {
  const { wasteNormId } = req.query;
  const { ...wasteNormUpdated } = req.body;
  try {
    const existingWasteNorm = await WasteNorm.findByPk(wasteNormId);
    if (!existingWasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await existingWasteNorm.update({
      ...wasteNormUpdated,
    });

    await redisCache.del("wasteNorm:all");

    res.status(200).json({
      message: "update waste norm successfully",
      data: existingWasteNorm,
    });
  } catch (error) {
    console.error("failed to update waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete waste norm
export const deleteWasteNormById = async (req, res) => {
  const { wasteNormId } = req.query;

  try {
    const wasteNorm = await WasteNorm.findByPk(wasteNormId);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await wasteNorm.destroy();
    await redisCache.del("wasteNorm:all");

    res
      .status(200)
      .json({ message: `delete wasteNormId:${wasteNormId} successfully` });
  } catch (error) {
    console.error("failed to delete waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};
