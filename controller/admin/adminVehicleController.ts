import { NextFunction, Request, Response } from "express";
import { Vehicle, VehicleCreationAttributes } from "../../models/admin/vehicle";
import { adminService } from "../../service/admin/adminService";

export const getAllVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: Vehicle,
      message: "get all vehicle successfully",
    });

    // Kiểm tra xem dữ liệu trả về có phải là mảng không để tránh lỗi crash
    if (response && Array.isArray(response.data)) {
      response.data.sort((a: any, b: any) => {
        // 1. So sánh theo nhà xe (vehicleHouse) trước
        // Dùng || "" để phòng trường hợp dữ liệu trong DB bị null/undefined
        const houseCompare = (a.vehicleHouse || "").localeCompare(b.vehicleHouse || "", "vi", {
          sensitivity: "base",
        });

        // Nếu nhà xe khác nhau thì trả về kết quả luôn
        if (houseCompare !== 0) {
          return houseCompare;
        }

        // 2. Nếu trùng nhà xe, so sánh tiếp đến tên xe (vehicleName)
        // Bật numeric: true để xử lý sắp xếp tự nhiên các số (Tấn 1, Tấn 2, Tấn 10...)
        return (a.vehicleName || "").localeCompare(b.vehicleName || "", "vi", {
          numeric: true,
          sensitivity: "base",
        });
      });
    }

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
