import { NextFunction, Request, Response } from "express";
import { MachinePaper, MachinePaperCreationAttributes } from "../../models/admin/machinePaper";
import { MachineBox, MachineBoxCreationAttributes } from "../../models/admin/machineBox";
import { adminMachineService } from "../../service/admin/adminMachineService";

//===============================PAPER=====================================

//get all machine
export const getAllMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminMachineService.getAllMachine(MachinePaper);
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
    const response = await adminMachineService.getMachineById(MachinePaper, Number(machineId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add machine
export const createMachinePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminMachineService.createMachine(
      MachinePaper,
      req.body as MachinePaperCreationAttributes
    );
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
    const response = await adminMachineService.updateMachineById(
      MachinePaper,
      Number(machineId),
      machineUpdated
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete machine
export const deleteMachinePaperById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminMachineService.deleteMachineById(MachinePaper, Number(machineId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================BOX=====================================

//get all machine
export const getAllMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminMachineService.getAllMachine(MachineBox);
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
    const response = await adminMachineService.getMachineById(MachineBox, Number(machineId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add machine
export const createMachineBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminMachineService.createMachine(
      MachineBox,
      req.body as MachineBoxCreationAttributes
    );
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
    const response = await adminMachineService.updateMachineById(
      MachineBox,
      Number(machineId),
      machineUpdated
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete machine
export const deleteMachineBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.query as { machineId: string };

  try {
    const response = await adminMachineService.deleteMachineById(MachineBox, Number(machineId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
