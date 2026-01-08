import { NextFunction, Request, Response } from "express";
import { MachinePaper, MachinePaperCreationAttributes } from "../../models/admin/machinePaper";
import { MachineBox, MachineBoxCreationAttributes } from "../../models/admin/machineBox";
import { adminService } from "../../service/admin/adminService";

//===============================PAPER=====================================

//get all machine
export const getAllMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: MachinePaper,
      message: "get all machine paper successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get machine by id
//use to get id for update
export const getMachinePaperById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.getItemById({
      model: MachinePaper,
      itemId: Number(machineId),
      errMessage: "machine not found",
      errCode: "MACHINE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add machine
export const createMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: MachinePaper,
      data: req.body as MachinePaperCreationAttributes,
      message: "Create machine successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update machine
export const updateMachinePaperById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };
  const { ...machineUpdated } = req.body;

  try {
    const response = await adminService.updateItem({
      model: MachinePaper,
      itemId: Number(machineId),
      dataUpdated: machineUpdated,
      message: "update machine successfully",
      errMessage: "machine not found",
      errCode: "MACHINE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete machine
export const deleteMachinePaperById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.deleteItem({
      model: MachinePaper,
      itemId: Number(machineId),
      message: `delete machineId: ${machineId} successfully`,
      errMessage: "machine not found",
      errCode: "MACHINE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================BOX=====================================

//get all machine
export const getAllMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: MachineBox,
      message: "get all machine box successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get machine by id
//use to get id for update
export const getMachineBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.getItemById({
      model: MachineBox,
      itemId: Number(machineId),
      errMessage: "machine not found",
      errCode: "MACHINE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add machine
export const createMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: MachineBox,
      data: req.body as MachineBoxCreationAttributes,
      message: "Create machine successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update machine
export const updateMachineBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };
  const { ...machineUpdated } = req.body;

  try {
    const response = await adminService.updateItem({
      model: MachineBox,
      itemId: Number(machineId),
      dataUpdated: machineUpdated,
      message: "update machine successfully",
      errMessage: "machine not found",
      errCode: "MACHINE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete machine
export const deleteMachineBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminService.deleteItem({
      model: MachineBox,
      itemId: Number(machineId),
      message: `delete machineId: ${machineId} successfully`,
      errMessage: "machine not found",
      errCode: "MACHINE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
