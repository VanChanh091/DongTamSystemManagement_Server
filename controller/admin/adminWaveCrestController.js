import Redis from "ioredis";
import WaveCrestCoefficient from "../../models/admin/waveCrestCoefficient.js";

const redisCache = new Redis();

//get all wave crest coefficient
export const getAllWaveCrestCoefficient = async (req, res) => {
  try {
    const cacheKey = "waveCrest:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data wave crest coefficient from Redis");
      return res.status(200).json({
        message: "Get all wave crest coefficient from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await WaveCrestCoefficient.findAll();

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    res
      .status(200)
      .json({ message: "get all wave crest coefficient successfully", data });
  } catch (error) {
    console.error("failed to get all wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get wave crest by id
//use to get id for update
export const getWaveCrestById = async (req, res) => {
  const { waveCrestId } = req.query;
  try {
    const cacheKey = "waveCrest:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data wave crest from Redis");
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter(
        (item) => item.waveCrestCoefficientId == waveCrestId
      );
      return res.status(200).json({
        message: "Get all wave crest from cache",
        data: filteredData,
      });
    }

    const waveCrest = await WaveCrestCoefficient.findByPk(waveCrestId);
    if (!waveCrest) {
      return res.status(404).json({ message: "wave crest not found" });
    }

    return res.status(200).json({
      message: `get wave crest by waveCrestId:${waveCrestId}`,
      data: waveCrest,
    });
  } catch (error) {
    console.error(
      `failed to get wave crest by waveCrestId:${waveCrestId}`,
      error.message
    );
    res.status(500).json({ message: "server error" });
  }
};

//add wave crest coefficient
export const createWaveCrestCoefficient = async (req, res) => {
  const { ...waveCrest } = req.body;

  const transaction = await WaveCrestCoefficient.sequelize.transaction();
  try {
    const newWaveCrest = await WaveCrestCoefficient.create(
      { ...waveCrest },
      { transaction }
    );

    await transaction.commit();
    await redisCache.del("waveCrest:all");

    res.status(200).json({
      message: "create wave crest coefficient successfully",
      data: newWaveCrest,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("failed to create wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update wave crest coefficient
export const updateWaveCrestById = async (req, res) => {
  const { waveCrestId } = req.query;
  const { ...waveCrestUpdated } = req.body;
  try {
    const existingWaveCrest = await WaveCrestCoefficient.findByPk(waveCrestId);
    if (!existingWaveCrest) {
      return res
        .status(404)
        .json({ message: "wave crest coefficient not found" });
    }

    await existingWaveCrest.update({
      ...waveCrestUpdated,
    });

    await redisCache.del("waveCrest:all");

    res.status(200).json({
      message: "update wave crest coefficient successfully",
      data: existingWaveCrest,
    });
  } catch (error) {
    console.error("failed to update wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete wave crest coefficient
export const deleteWaveCrestById = async (req, res) => {
  const { waveCrestId } = req.query;
  try {
    const waveCrest = await WaveCrestCoefficient.findByPk(waveCrestId);
    if (!waveCrest) {
      return res
        .status(404)
        .json({ message: "wave crest coefficient not found" });
    }

    await waveCrest.destroy();
    await redisCache.del("waveCrest:all");

    res.status(200).json({
      message: `delete waveCrestCoefficientId:${waveCrestId} successfully`,
    });
  } catch (error) {
    console.error("failed to delete wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};
