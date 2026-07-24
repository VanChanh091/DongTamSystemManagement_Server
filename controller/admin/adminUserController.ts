import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";
import { userRole } from "../../models/user/user";

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
