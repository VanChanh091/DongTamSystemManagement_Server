import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";
import { userRole } from "../../models/user/user";

export const getUsersAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { name, phone, permissions } = req.query as {
    name?: string;
    phone?: string;
    permissions?: string | string[];
  };

  try {
    let response;

    if (name) {
      response = await adminService.getUsersAdmin("name", name);
    } else if (phone) {
      response = await adminService.getUsersAdmin("phone", phone);
    } else if (permissions) {
      response = await adminService.getUsersAdmin("permission", permissions);
    } else {
      response = await adminService.getAllUsers();
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateInfoUser = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, newRole } = req.query as { userId?: string; newRole?: userRole };
  const { permissions, userIds, newPassword } = req.body as {
    permissions?: string | string[];
    userIds?: number | number[];
    newPassword?: string;
  };

  try {
    let response;

    if (userId && newRole) {
      response = await adminService.updateUserRole(Number(userId), newRole);
    } else if (userId && permissions) {
      response = await adminService.updatePermissions(Number(userId), permissions);
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
