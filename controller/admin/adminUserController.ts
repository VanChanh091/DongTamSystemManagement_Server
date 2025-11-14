import { Request, Response } from "express";
import { adminService } from "../../service/adminService";
import { userRole } from "../../models/user/user";

//get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const response = await adminService.getAllUsers();
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get user by name
export const getUserByName = async (req: Request, res: Response) => {
  const { name } = req.query as { name: string };
  const nameLower = name?.toLowerCase();

  try {
    const response = await adminService.getUserByName(nameLower);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get user by phone
export const getUserByPhone = async (req: Request, res: Response) => {
  const { phone } = req.query as { phone: string };

  try {
    const response = await adminService.getUserByPhone(phone);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get user by permission
export const getUserByPermission = async (req: Request, res: Response) => {
  let { permission } = req.query as { permission: string | string[] };

  try {
    const response = await adminService.getUserByPermission(permission);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//update role of user
export const updateUserRole = async (req: Request, res: Response) => {
  const { userId, newRole } = req.query as { userId: string; newRole: userRole };

  try {
    const response = await adminService.updateUserRole(Number(userId), newRole);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//update permissions of user
export const updatePermissions = async (req: Request, res: Response) => {
  const { userId } = req.query as { userId: string };
  const { permissions } = req.body as { permissions: string | string[] };

  try {
    const response = await adminService.updatePermissions(Number(userId), permissions);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//delete user
export const deleteUserById = async (req: Request, res: Response) => {
  const { userId } = req.query as { userId: string };

  try {
    const response = await adminService.deleteUserById(Number(userId));
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//reset-password
export const resetPassword = async (req: Request, res: Response) => {
  const { userIds, newPassword } = req.body as { userIds: number | number[]; newPassword: string };

  try {
    const response = await adminService.resetPassword(userIds, newPassword);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
