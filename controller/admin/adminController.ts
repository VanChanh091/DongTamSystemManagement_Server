import { NextFunction, Request, Response } from "express";
import { adminCriteriaCheckService } from "../../service/admin/adminCriteriaCheckService";
import { adminService } from "../../service/admin/adminService";
import {
  processTypeQC,
  QcCriteriaCreationAttributes,
} from "../../models/qualityControl/qcCriteria";
import { adminCriteriaService } from "../../service/admin/adminCriteriaService";
import { FluteRatio, FluteRatioCreationAttributes } from "../../models/admin/fluteRatio";
import { userRole } from "../../models/user/user";
import { Vehicle, VehicleCreationAttributes } from "../../models/admin/vehicle";
import {
  WaveCrestCoefficient,
  WaveCrestCreationAttributes,
} from "../../models/admin/waveCrestCoefficient";

// ================================ ORDER ====================================

//getOrderPending
export const getOrderPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getOrderPending();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//accept or reject order
export const updateStatusAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.query as { id: string };
  const { newStatus, rejectReason } = req.body;

  try {
    const response = await adminService.updateStatusOrder({
      req,
      orderId: id,
      newStatus,
      rejectReason,
      senderId: req.user.userId,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ============================= CRITERIA CHECK PAPER/BOX =================================

//get all criteria check
export const getAllCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper, machine } = req.query as { isPaper: string; machine?: string };

  try {
    const response = await adminCriteriaCheckService.getAllCriteriaCheck(isPaper, machine);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create new criteria check
export const createNewCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper } = req.query as { isPaper: string };

  try {
    const response = await adminCriteriaCheckService.createNewCriteriaCheck(req.body, isPaper);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update criteria check
export const updateCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { criteriaId, isPaper } = req.query as { criteriaId: string; isPaper: string };

  try {
    const response = await adminCriteriaCheckService.updateCriteriaCheck(
      Number(criteriaId),
      req.body,
      isPaper,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete criteria check
export const deleteCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { criteriaId, isPaper } = req.query as { criteriaId: string; isPaper: string };

  try {
    const response = await adminCriteriaCheckService.deleteCriteriaCheck(
      Number(criteriaId),
      isPaper,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ============================= CRITERIA =================================

//get all qc criteria
export const getAllQcCriteria = async (req: Request, res: Response, next: NextFunction) => {
  const { type } = req.query as { type: processTypeQC };

  try {
    const response = await adminCriteriaService.getAllQcCriteria(type);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create new qc criteria
export const createNewCriteria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminCriteriaService.createNewCriteria(
      req.body as QcCriteriaCreationAttributes,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update qc criteria
export const updateCriteria = async (req: Request, res: Response, next: NextFunction) => {
  const { qcCriteriaId } = req.query as { qcCriteriaId: string };

  try {
    const response = await adminCriteriaService.updateCriteria(
      Number(qcCriteriaId),
      req.body as QcCriteriaCreationAttributes,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete qc criteria
export const deleteCriteria = async (req: Request, res: Response, next: NextFunction) => {
  const { qcCriteriaId } = req.query as { qcCriteriaId: string };

  try {
    const response = await adminCriteriaService.deleteCriteria(Number(qcCriteriaId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ============================= FLUTE RATIO =================================

export const getAllFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: FluteRatio,
      message: "get all flute ratio successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: FluteRatio,
      data: req.body as FluteRatioCreationAttributes,
      message: "Create flute ratio successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  const { fluteRatioId } = req.query as { fluteRatioId: string };

  try {
    const response = await adminService.updateItem({
      model: FluteRatio,
      itemId: Number(fluteRatioId),
      dataUpdated: req.body as FluteRatioCreationAttributes,
      message: "update flute ratio successfully",
      errMessage: "flute ratio not found",
      errCode: "FLUTE_RATIO_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  const { fluteRatioId } = req.query as { fluteRatioId: string };

  try {
    const response = await adminService.deleteItem({
      model: FluteRatio,
      itemId: Number(fluteRatioId),
      message: "delete flute ratio successfully",
      errMessage: "flute ratio not found",
      errCode: "FLUTE_RATIO_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ============================= USER =================================

export const getUsersAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllUsers();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateInfoUser = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, newRole } = req.query as { userId?: string; newRole?: userRole };
  const { permissions, userIds, newPassword, newDepartment } = req.body as {
    permissions?: string | string[];
    userIds?: number | number[];
    newPassword?: string;
    newDepartment?: string;
  };

  try {
    let response;

    if (userId && newRole) {
      response = await adminService.updateUserRole(Number(userId), newRole);
    } else if (userId && permissions) {
      response = await adminService.updatePermissions(Number(userId), permissions);
    } else if (userId && newDepartment) {
      response = await adminService.updateUserDepartment(Number(userId), newDepartment);
    } else if (userIds && newPassword) {
      response = await adminService.resetPassword(userIds, newPassword);
    } else {
      return res.status(400).json({ message: "Invalid update parameters" });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete user
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query as { userId: string };

  try {
    const response = await adminService.deleteUserById(Number(userId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// ============================= VEHICLE =================================

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
        const houseCompare = (b.vehicleHouse || "").localeCompare(a.vehicleHouse || "", "vi", {
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

// ============================= WAVE CREST =================================

export const getWaveCrestCoefficient = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    let response;

    if (waveCrestId) {
      response = await adminService.getItemById({
        model: WaveCrestCoefficient,
        itemId: Number(waveCrestId),
        errMessage: "wave crest not found",
        errCode: "WAVE_CREST_NOT_FOUND",
      });
    } else {
      response = await adminService.getAllItems({
        model: WaveCrestCoefficient,
        message: "get all wave crest coefficient successfully",
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add wave crest coefficient
export const createWaveCrest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: WaveCrestCoefficient,
      data: req.body as WaveCrestCreationAttributes,
      message: "create wave crest coefficient successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update wave crest coefficient
export const updateWaveCrest = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.updateItem({
      model: WaveCrestCoefficient,
      itemId: Number(waveCrestId),
      dataUpdated: req.body as WaveCrestCreationAttributes,
      message: "update wave crest coefficient successfully",
      errMessage: "wave crest coefficient not found",
      errCode: "WAVE_CREST_COEFF_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete wave crest coefficient
export const deleteWaveCrest = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.deleteItem({
      model: WaveCrestCoefficient,
      itemId: Number(waveCrestId),
      message: `delete waveCrestCoefficientId: ${waveCrestId} successfully`,
      errMessage: "wave crest coefficient not found",
      errCode: "WAVE_CREST_COEFF_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
