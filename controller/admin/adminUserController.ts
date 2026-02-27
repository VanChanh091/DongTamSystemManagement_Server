import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";
import { userRole } from "../../models/user/user";
import { AppError } from "../../utils/appError";

//get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllUsers();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get user by name
export const getUserByName = async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.query as { name: string };
  const nameLower = name?.toLowerCase();

  try {
    const response = await adminService.getUserByName(nameLower);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get user by phone
export const getUserByPhone = async (req: Request, res: Response, next: NextFunction) => {
  const { phone } = req.query as { phone: string };

  try {
    const response = await adminService.getUserByPhone(phone);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get user by permission
export const getUserByPermission = async (req: Request, res: Response, next: NextFunction) => {
  let { permission } = req.query as { permission: string | string[] };

  try {
    const response = await adminService.getUserByPermission(permission);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateInfoUser = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, newRole } = req.query as { userId: string; newRole: userRole };
  const { permissions, userIds, newPassword } = req.body as {
    permissions: string | string[];
    userIds: number | number[];
    newPassword: string;
  };

  try {
    let response;

    if (userId && newRole) {
      response = await adminService.updateUserRole(Number(userId), newRole);
    } else if (userId && permissions) {
      response = await adminService.updatePermissions(Number(userId), permissions);
    } else if (newPassword) {
      response = await adminService.resetPassword(userIds, newPassword);
    } else {
      return res.status(400).json({ message: "Invalid update parameters" });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update role of user
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, newRole } = req.query as { userId: string; newRole: userRole };

  try {
    if (!userId || !newRole) {
      throw AppError.BadRequest("Missing userId or newRole", "MISSING_PARAMETERS");
    }

    const response = await adminService.updateUserRole(Number(userId), newRole);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update permissions of user
export const updatePermissions = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query as { userId: string };
  const { permissions } = req.body as { permissions: string | string[] };

  try {
    const response = await adminService.updatePermissions(Number(userId), permissions);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//reset-password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { userIds, newPassword } = req.body as { userIds: number | number[]; newPassword: string };

  try {
    const response = await adminService.resetPassword(userIds, newPassword);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete user
export const deleteUserById = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query as { userId: string };

  try {
    const response = await adminService.deleteUserById(Number(userId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
