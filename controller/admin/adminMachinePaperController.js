import Redis from "ioredis";
import MachinePaper from "../../models/admin/machinePaper.js";
import { NUMBER } from "sequelize";

const redisCache = new Redis();

//get all machine
export const getAllMachine = async (req, res) => {
  try {
    const cacheKey = "machine:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data machine from Redis");
      return res.status(200).json({
        message: "Get all machine from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await MachinePaper.findAll();

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 1800);

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error) {
    console.error("failed to get all machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get machine by id
export const getMachineById = async (req, res) => {
  const { machineId } = req.query;
  try {
    const cacheKey = "machine:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data machine from Redis");
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter(
        (item) => item.machineId == machineId
      );
      return res.status(200).json({
        message: "Get all machine from cache",
        data: filteredData,
      });
    }

    const machine = await MachinePaper.findOne({
      where: { machineId: machineId },
    });
    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    return res
      .status(200)
      .json({ message: `get machine by id:${machineId}`, data: machine });
  } catch (error) {
    console.error(`failed to get machine by id:${machineId}`, error.message);
    res.status(500).json({ message: "server error" });
  }
};

//add machine
export const createMachine = async (req, res) => {
  const { ...machine } = req.body;

  const transaction = await MachinePaper.sequelize.transaction();
  try {
    const newMachine = await MachinePaper.create(
      { ...machine },
      { transaction }
    );

    await transaction.commit();
    await redisCache.del("machine:all");

    res
      .status(200)
      .json({ message: "create machine successfully", data: newMachine });
  } catch (error) {
    await transaction.rollback();
    console.error("failed to create machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update machine
export const updateMachineById = async (req, res) => {
  const { machineId } = req.query;
  const { ...machineUpdated } = req.body;
  try {
    const existingMachine = await MachinePaper.findByPk(machineId);
    if (!existingMachine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await existingMachine.update({
      ...machineUpdated,
    });

    await redisCache.del("machine:all");

    res
      .status(200)
      .json({ message: "update machine successfully", data: existingMachine });
  } catch (error) {
    console.error("failed to update machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete machine
export const deleteMachineById = async (req, res) => {
  const { machineId } = req.query;
  try {
    const machine = await MachinePaper.findByPk(machineId);
    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await machine.destroy();
    await redisCache.del("machine:all");

    res
      .status(200)
      .json({ message: `delete machineId:${machineId} successfully` });
  } catch (error) {
    console.error("failed to delete machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};
