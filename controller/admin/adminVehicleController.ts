import { NextFunction, Request, Response } from "express";
import { Vehicle, VehicleCreationAttributes } from "../../models/admin/vehicle";
import { adminService } from "../../service/admin/adminService";

export const getAllVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: Vehicle,
      message: "get all vehicle successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createNewVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: Vehicle,
      data: req.body as VehicleCreationAttributes,
      message: "Create vehicle successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req: Request, res: Response, next: NextFunction) => {
  const { vehicleId } = req.query as { vehicleId: string };

  try {
    const response = await adminService.updateItem({
      model: Vehicle,
      itemId: Number(vehicleId),
      dataUpdated: req.body as VehicleCreationAttributes,
      message: "update vehicle successfully",
      errMessage: "vehicle not found",
      errCode: "VEHICLE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req: Request, res: Response, next: NextFunction) => {
  const { vehicleId } = req.query as { vehicleId: string };

  try {
    const response = await adminService.deleteItem({
      model: Vehicle,
      itemId: Number(vehicleId),
      message: "delete vehicle successfully",
      errMessage: "vehicle not found",
      errCode: "VEHICLE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
