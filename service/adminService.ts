import bcrypt from "bcrypt";
import cloudinary from "../configs/connectCloudinary";
import { validPermissions } from "../configs/machineLabels";
import { OrderStatus } from "../models/order/order";
import { userRole } from "../models/user/user";
import { adminRepository } from "../repository/adminRepository";
import { AppError } from "../utils/appError";
import { getCloudinaryPublicId } from "../utils/image/converToWebp";
import { WaveCrestCoefficient } from "../models/admin/waveCrestCoefficient";

export const adminService = {
  //===============================ADMIN MACHINE=====================================

  getAllMachine: async (model: any) => {
    try {
      const result = await adminRepository.getAllMachine(model);
      return { message: "get all machine successfully", data: result };
    } catch (error) {
      console.error("failed to get all machine: ", error);
      throw AppError.ServerError();
    }
  },

  getMachineById: async (model: any, machineId: number) => {
    try {
      const machine = await adminRepository.getMachineByPk(model, machineId);
      if (!machine) {
        throw AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
      }

      return { message: `get machine by id: ${machineId}`, data: machine };
    } catch (error) {
      console.error(`failed to get machine by id: ${machineId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createMachine: async (model: any, data: any) => {
    const transaction = await model.sequelize?.transaction();

    try {
      const newMachine = await adminRepository.createMachine(model, data, transaction);

      await transaction?.commit();

      return { message: "Create machine successfully", data: newMachine };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ Failed to create machine:", error);
      throw AppError.ServerError();
    }
  },

  updateMachineById: async (model: any, machineId: number, machineUpdated: any) => {
    try {
      const existingMachine = await adminRepository.getMachineByPk(model, machineId);
      if (!existingMachine) {
        throw AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
      }

      await existingMachine.update({ ...machineUpdated });

      return { message: "update machine successfully", data: existingMachine };
    } catch (error) {
      console.error("failed to update machine", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteMachineById: async (model: any, machineId: number) => {
    try {
      const machine = await adminRepository.getMachineByPk(model, machineId);
      if (!machine) {
        throw AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
      }

      await machine.destroy();

      return { message: `delete machineId: ${machineId} successfully` };
    } catch (error) {
      console.error("failed to delete machine", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================ADMIN ORDER=====================================

  getOrderPending: async () => {
    try {
      const data = await adminRepository.findOrderPending();
      return { message: "get all order have status:pending", data };
    } catch (error) {
      console.error("failed to get order pending", error);
      throw AppError.ServerError();
    }
  },

  updateStatusOrder: async (orderId: string, newStatus: OrderStatus, rejectReason: string) => {
    try {
      if (!["accept", "reject"].includes(newStatus)) {
        throw AppError.BadRequest("Invalid status", "INVALID_STATUS");
      }

      const order = await adminRepository.findByOrderId(orderId);
      if (!order) {
        throw AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
      }

      // const customer = order.Customer;
      // const newDebt = Number(customer.debtCurrent || 0) + Number(order.totalPrice || 0);

      if (newStatus === "reject") {
        order.set({ status: newStatus, rejectReason: rejectReason || "" });
      } else {
        //calculate debt limit of customer
        // if (newDebt > customer.debtLimit) {
        //   return res.status(400).json({ message: "Debt limit exceeded" });
        // }
        // await customer.update({ debtCurrent: newDebt });

        //check type product

        order.set({
          status: order.Product.typeProduct == "Phí Khác" ? "planning" : newStatus,
          rejectReason: null,
        });
      }

      await order.save();

      return { message: "Order status updated successfully", order };
    } catch (error) {
      console.error("failed to update order", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================ADMIN USER======================================

  getAllUsers: async () => {
    try {
      const data = await adminRepository.getAllUser();

      const sanitizedData = data
        .map((user) => user.get({ plain: true }))
        .filter((user) => user.role?.toLowerCase() !== "admin");

      return { message: "Get all users successfully (excluding admin)", data: sanitizedData };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw AppError.ServerError();
    }
  },

  getUserByName: async (name: string) => {
    try {
      if (!name) {
        throw AppError.BadRequest("Name is required", "NAME_REQUIRED");
      }

      const users = await adminRepository.getUserByName(name);
      if (users.length === 0) {
        throw AppError.NotFound("User not found", "USER_NOT_FOUND");
      }

      const sanitizedUsers = users
        .map((user) => user.get({ plain: true }))
        .filter((user) => user.role?.toLowerCase() !== "admin");

      return { message: "Get all users by name from DB", data: sanitizedUsers };
    } catch (error) {
      console.error("Error fetching user by name:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getUserByPhone: async (phone: string) => {
    try {
      if (!phone) {
        throw AppError.BadRequest("Phone number is required", "PHONE_REQUIRED");
      }
      const users = await adminRepository.getUserByPhone(phone);

      if (users.length === 0) {
        throw AppError.NotFound("User not found", "USER_NOT_FOUND");
      }

      const sanitizedUsers = users
        .map((user) => user.get({ plain: true }))
        .filter((user) => user.role?.toLowerCase() !== "admin");

      return { message: "Get user by phone from DB", data: sanitizedUsers };
    } catch (error) {
      console.error("Error fetching user by phone:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getUserByPermission: async (permission: string | string[]) => {
    try {
      if (!permission) {
        throw AppError.BadRequest("Permission is required", "PERMISSION_REQUIRED");
      }

      if (!Array.isArray(permission)) {
        permission = [permission as string]; // chuyển về dạng mảng nếu chỉ có 1 item
      }

      const lowerPermissions = (permission as string[]).map((p) => p.toLowerCase()).filter(Boolean);

      const users = await adminRepository.getAllUser();

      const matchedUsers = users.filter((user) => {
        const perms: string[] = Array.isArray(user.permissions)
          ? (user.permissions as string[])
          : JSON.parse((user.permissions as string) || "[]");

        return perms.some((perm: string) => lowerPermissions.includes(perm.toLowerCase()));
      });

      const sanitizedUsers = matchedUsers
        .map((user) => user.get({ plain: true }))
        .filter((user) => user.role?.toLowerCase() !== "admin");

      return { message: "Get users by permission from DB", data: sanitizedUsers };
    } catch (error) {
      console.error("Error fetching users by permission:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateUserRole: async (userId: number, newRole: userRole) => {
    try {
      const validRoles = ["admin", "manager", "user"];
      if (!validRoles.includes(newRole)) {
        throw AppError.BadRequest("Invalid role provided", "INVALID_ROLE");
      }

      const user = await adminRepository.getUserByPk(userId);
      if (!user) {
        throw AppError.NotFound("User not found", "USER_NOT_FOUND");
      }

      user.role = newRole as "admin" | "manager" | "user";

      if (newRole === "admin") {
        user.permissions = ["all"];
      } else if (newRole === "manager") {
        user.permissions = ["manager"];
      } else {
        user.permissions = ["read"];
      }

      await user.save();

      const sanitizedData = user.toJSON() as Record<string, any>;
      delete sanitizedData.password;

      return { message: "User role updated successfully", data: sanitizedData };
    } catch (error) {
      console.error("Error updating user role:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatePermissions: async (userId: number, permissions: string | string[]) => {
    try {
      // Validate permissions input
      if (!Array.isArray(permissions) || permissions.length === 0) {
        throw AppError.BadRequest("Invalid permissions format", "INVALID_PERMISSIONS_FORMAT");
      }

      // check valid permissions
      const invalid = permissions.filter((p) => !validPermissions.includes(p));
      if (invalid.length > 0) {
        throw AppError.BadRequest(
          `Invalid permissions: ${invalid.join(", ")}`,
          "INVALID_PERMISSIONS"
        );
      }

      const user = await adminRepository.getUserByPk(userId);
      if (!user) {
        throw AppError.NotFound("User not found", "USER_NOT_FOUND");
      }

      // Update user's permissions
      user.permissions = permissions;
      await user.save();

      return {
        message: "Permissions updated successfully",
        userId: user.userId,
        permissions: user.permissions,
      };
    } catch (error) {
      console.error("Error updating permissions:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteUserById: async (userId: number) => {
    try {
      const user = await adminRepository.getUserByPk(userId);
      if (!user) {
        throw AppError.NotFound("User not found", "USER_NOT_FOUND");
      }

      const imageName = user.avatar;

      await user.destroy();

      if (imageName && imageName.includes("cloudinary.com")) {
        const publicId = getCloudinaryPublicId(imageName);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }

      return { message: "User deleted successfully" };
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  resetPassword: async (userIds: number | number[], newPassword: string) => {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
        throw AppError.BadRequest(
          "userIds must be a non-empty array and newPassword is required",
          "INVALID_INPUT"
        );
      }
      const saltPassword = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltPassword);

      // Tìm và cập nhật tất cả user
      const updatedUserIds = [];
      for (const id of userIds) {
        const user = await adminRepository.getUserByPk(id);
        if (user) {
          user.password = hashedPassword;
          await user.save();
          updatedUserIds.push(user.userId);
        }
      }

      if (updatedUserIds.length === 0) {
        throw AppError.NotFound("users not found to update", "USER_NOT_FOUND");
      }

      return { message: "Passwords reset successfully" };
    } catch (error) {
      console.error("Error resetting passwords:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================ADMIN WASTE NORM=====================================

  getAllWaste: async (model: any) => {
    try {
      const data = await adminRepository.getAllWaste(model);
      return { message: "get all waste successfully", data };
    } catch (error) {
      console.error("failed to get all waste", error);
      throw AppError.ServerError();
    }
  },

  getWasteById: async (model: any, wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(model, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("wasteId not found", "WASTE_NOT_FOUND");
      }

      return { message: `get waste by wasteId: ${wasteId}`, data: wasteNorm };
    } catch (error) {
      console.error(`failed to get wasteId: ${wasteId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createWaste: async (model: any, data: any) => {
    const transaction = await model.sequelize?.transaction();

    try {
      const newWasteNorm = await adminRepository.createWaste(model, data, transaction);

      await transaction?.commit();

      return { message: "create waste successfully", data: newWasteNorm };
    } catch (error) {
      await transaction?.rollback();
      console.error("failed to create waste", error);
      throw AppError.ServerError();
    }
  },

  updateWaste: async (model: any, wasteId: number, wasteNormUpdated: any) => {
    try {
      const existingWasteNorm = await adminRepository.getWasteByPk(model, wasteId);
      if (!existingWasteNorm) {
        throw AppError.NotFound("waste norm not found", "WASTE_NOT_FOUND");
      }

      await adminRepository.updateWaste(existingWasteNorm, { ...wasteNormUpdated });

      return { message: "update waste norm successfully", data: existingWasteNorm };
    } catch (error) {
      console.error("failed to update waste norm", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteWaste: async (model: any, wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(model, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("waste norm not found", "WASTE_NOT_FOUND");
      }

      await wasteNorm.destroy();

      return { message: `delete wasteNormId: ${wasteId} successfully` };
    } catch (error) {
      console.error("failed to delete waste norm", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //===============================ADMIN WASTE CREST=====================================

  getAllWaveCrestCoefficient: async () => {
    try {
      const data = await adminRepository.getAllWaste(WaveCrestCoefficient);
      return { message: "get all wave crest coefficient successfully", data };
    } catch (error) {
      console.error("failed to get all wave crest coefficient", error);
      throw AppError.ServerError();
    }
  },

  getWaveCrestById: async (wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(WaveCrestCoefficient, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("wave crest not found", "WAVE_CREST_NOT_FOUND");
      }

      return { message: `get wave crest by waveCrestId: ${wasteId}`, data: wasteNorm };
    } catch (error) {
      console.error(`failed to get wave crest by waveCrestId: ${wasteId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createWaveCrestCoefficient: async (data: any) => {
    const transaction = await WaveCrestCoefficient.sequelize?.transaction();

    try {
      const newWasteNorm = await adminRepository.createWaste(
        WaveCrestCoefficient,
        data,
        transaction
      );

      await transaction?.commit();

      return { message: "create wave crest coefficient successfully", data: newWasteNorm };
    } catch (error) {
      await transaction?.rollback();
      console.error("failed to create wave crest coefficient", error);
      throw AppError.ServerError();
    }
  },

  updateWaveCrestById: async (wasteId: number, wasteNormUpdated: any) => {
    try {
      const existingWasteNorm = await adminRepository.getWasteByPk(WaveCrestCoefficient, wasteId);
      if (!existingWasteNorm) {
        throw AppError.NotFound("wave crest coefficient not found", "WAVE_CREST_COEFF_NOT_FOUND");
      }

      await adminRepository.updateWaste(existingWasteNorm, { ...wasteNormUpdated });

      return { message: "update wave crest coefficient successfully", data: existingWasteNorm };
    } catch (error) {
      console.error("failed to update wave crest coefficient", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteWaveCrestById: async (wasteId: number) => {
    try {
      const wasteNorm = await adminRepository.getWasteByPk(WaveCrestCoefficient, wasteId);
      if (!wasteNorm) {
        throw AppError.NotFound("wave crest coefficient not found", "WAVE_CREST_COEFF_NOT_FOUND");
      }

      await wasteNorm.destroy();

      return { message: `delete waveCrestCoefficientId: ${wasteId} successfully` };
    } catch (error) {
      console.error("failed to delete wave crest coefficient", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
