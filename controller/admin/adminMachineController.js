import MachinePaper from "../../models/admin/machinePaper.js";
import MachineBox from "../../models/admin/machineBox.js";

//===============================PAPER=====================================

//get all machine
export const getAllMachinePaper = async (req, res) => {
  try {
    const data = await MachinePaper.findAll();

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error) {
    console.error("failed to get all machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get machine by id
//use to get id for update
export const getMachinePaperById = async (req, res) => {
  const { machineId } = req.query;
  try {
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
export const createMachinePaper = async (req, res) => {
  const { ...machine } = req.body;

  const transaction = await MachinePaper.sequelize.transaction();
  try {
    const newMachine = await MachinePaper.create(
      { ...machine },
      { transaction }
    );

    await transaction.commit();

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
export const updateMachinePaperById = async (req, res) => {
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

    res
      .status(200)
      .json({ message: "update machine successfully", data: existingMachine });
  } catch (error) {
    console.error("failed to update machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete machine
export const deleteMachinePaperById = async (req, res) => {
  const { machineId } = req.query;
  try {
    const machine = await MachinePaper.findByPk(machineId);
    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await machine.destroy();

    res
      .status(200)
      .json({ message: `delete machineId:${machineId} successfully` });
  } catch (error) {
    console.error("failed to delete machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//===============================BOX=====================================

//get all machine
export const getAllMachineBox = async (req, res) => {
  try {
    const data = await MachineBox.findAll();

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error) {
    console.error("failed to get all machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get machine by id
//use to get id for update
export const getMachineBoxById = async (req, res) => {
  const { machineId } = req.query;

  if (!machineId) {
    return res
      .status(400)
      .json({ message: "Missing machineId query parameter" });
  }

  try {
    const machine = await MachineBox.findOne({
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
export const createMachineBox = async (req, res) => {
  const { ...machine } = req.body;

  const transaction = await MachineBox.sequelize.transaction();
  try {
    const newMachine = await MachineBox.create({ ...machine }, { transaction });

    await transaction.commit();

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
export const updateMachineBoxById = async (req, res) => {
  const { machineId } = req.query;
  const { ...machineUpdated } = req.body;

  try {
    const existingMachine = await MachineBox.findByPk(machineId);
    if (!existingMachine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await existingMachine.update({
      ...machineUpdated,
    });

    res
      .status(200)
      .json({ message: "update machine successfully", data: existingMachine });
  } catch (error) {
    console.error("failed to update machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete machine
export const deleteMachineBoxById = async (req, res) => {
  const { machineId } = req.query;
  try {
    const machine = await MachineBox.findByPk(machineId);
    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await machine.destroy();

    res
      .status(200)
      .json({ message: `delete machineId:${machineId} successfully` });
  } catch (error) {
    console.error("failed to delete machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};
