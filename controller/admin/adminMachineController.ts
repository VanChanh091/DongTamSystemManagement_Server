import { Request, Response } from "express";
import { MachinePaper, MachinePaperCreationAttributes } from "../../models/admin/machinePaper";
import { MachineBox, MachineBoxCreationAttributes } from "../../models/admin/machineBox";

//===============================PAPER=====================================

//get all machine
export const getAllMachinePaper = async (req: Request, res: Response) => {
  try {
    const data = await MachinePaper.findAll();

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error: any) {
    console.error("failed to get all machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get machine by id
//use to get id for update
export const getMachinePaperById = async (req: Request, res: Response) => {
  const { machineId } = req.query as { machineId: string };
  const id = Number(machineId);

  try {
    const machine = await MachinePaper.findOne({
      where: { machineId: id },
    });

    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    return res.status(200).json({ message: `get machine by id:${id}`, data: machine });
  } catch (error: any) {
    console.error(`failed to get machine by id:${id}`, error.message);
    res.status(500).json({ message: "server error" });
  }
};

//add machine
export const createMachinePaper = async (req: Request, res: Response) => {
  const machine = req.body as MachinePaperCreationAttributes;
  const transaction = await MachinePaper.sequelize?.transaction();

  try {
    const newMachine = await MachinePaper.create(machine, { transaction });

    await transaction?.commit();

    res.status(200).json({
      message: "Create machine successfully",
      data: newMachine,
    });
  } catch (error: any) {
    await transaction?.rollback();
    console.error("❌ Failed to create machine:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

//update machine
export const updateMachinePaperById = async (req: Request, res: Response) => {
  const { machineId } = req.query as { machineId: string };
  const { ...machineUpdated } = req.body;

  const id = Number(machineId);

  try {
    const existingMachine = await MachinePaper.findByPk(id);
    if (!existingMachine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await existingMachine.update({
      ...machineUpdated,
    });

    res.status(200).json({ message: "update machine successfully", data: existingMachine });
  } catch (error: any) {
    console.error("failed to update machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete machine
export const deleteMachinePaperById = async (req: Request, res: Response) => {
  const { machineId } = req.query as { machineId: string };
  const id = Number(machineId);

  try {
    const machine = await MachinePaper.findByPk(id);
    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await machine.destroy();

    res.status(200).json({ message: `delete machineId:${id} successfully` });
  } catch (error: any) {
    console.error("failed to delete machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//===============================BOX=====================================

//get all machine
export const getAllMachineBox = async (req: Request, res: Response) => {
  try {
    const data = await MachineBox.findAll();

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error: any) {
    console.error("failed to get all machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get machine by id
//use to get id for update
export const getMachineBoxById = async (req: Request, res: Response) => {
  const { machineId } = req.query as { machineId: string };
  const id = Number(machineId);

  try {
    const machine = await MachineBox.findOne({
      where: { machineId: id },
    });

    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    return res.status(200).json({ message: `get machine by id:${id}`, data: machine });
  } catch (error: any) {
    console.error(`failed to get machine by id:${id}`, error.message);
    res.status(500).json({ message: "server error" });
  }
};

//add machine
export const createMachineBox = async (req: Request, res: Response) => {
  const machine = req.body as MachineBoxCreationAttributes;
  const transaction = await MachineBox.sequelize?.transaction();

  try {
    const newMachine = await MachineBox.create(machine, { transaction });

    await transaction?.commit();

    res.status(200).json({ message: "create machine successfully", data: newMachine });
  } catch (error: any) {
    await transaction?.rollback();
    console.error("failed to create machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update machine
export const updateMachineBoxById = async (req: Request, res: Response) => {
  const { machineId } = req.query as { machineId: string };
  const { ...machineUpdated } = req.body;

  const id = Number(machineId);

  try {
    const existingMachine = await MachineBox.findByPk(id);
    if (!existingMachine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await existingMachine.update({
      ...machineUpdated,
    });

    res.status(200).json({ message: "update machine successfully", data: existingMachine });
  } catch (error: any) {
    console.error("failed to update machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete machine
export const deleteMachineBoxById = async (req: Request, res: Response) => {
  const { machineId } = req.query as { machineId: string };
  const id = Number(machineId);

  try {
    const machine = await MachineBox.findByPk(id);
    if (!machine) {
      return res.status(404).json({ message: "machine not found" });
    }

    await machine.destroy();

    res.status(200).json({ message: `delete machineId:${id} successfully` });
  } catch (error: any) {
    console.error("failed to delete machine", error.message);
    res.status(500).json({ message: "server error" });
  }
};
