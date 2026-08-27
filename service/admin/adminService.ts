import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcrypt";
import { Request } from "express";
import { meiliService } from "../system/meiliService";
import { AppError } from "../../utils/appError";
import { User, userRole } from "../../models/user/user";
import { OrderStatus } from "../../models/order/order";
import { adminRepository } from "../../repository/adminRepository";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { MEILI_INDEX, validPermissions } from "../../assets/labelFields";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { inventoryService } from "../inventory/inventoryService";
import { OrderApproved } from "../../models/order/orderApproved";
import { NotificationModel } from "../../models/notification/notification";
import { REQUEST_CONFIG } from "../notification/requestType";
import { UserNotifications } from "../../models/notification/userNotifications";
import { CrudHelper } from "../../repository/helper/crud.helper.repository";

const devEnvironment = process.env.NODE_ENV !== "production";

export const adminService = {
  //===============================ADMIN CRUD=====================================

  getAllItems: async ({ model, options }: { model: any; options?: any }) => {
    try {
      const allItems = await CrudHelper.findAll({ model, options });
      return { message: "get all items successfully", data: allItems };
    } catch (error) {
      console.error("get all item failed:", error);
      throw AppError.ServerError();
    }
  },

  getItemById: async ({
    model,
    itemId,
    options,
  }: {
    model: any;
    itemId: number;
    options?: any;
  }) => {
    try {
      const item = await CrudHelper.findByPk({ model, id: itemId, options });
      if (!item) {
        throw AppError.NotFound("item not found", "ITEM_NOT_FOUND");
      }

      return { message: `get item by id: ${itemId}`, data: item };
    } catch (error) {
      console.error(`failed to get item by id: ${itemId}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createNewItem: async ({ model, data }: { model: any; data: any }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const newItem = await CrudHelper.create({ model, data, transaction });
        return { message: "create item successfully", data: newItem };
      });
    } catch (error) {
      console.error("create item failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateItem: async ({
    model,
    itemId,
    dataUpdated,
  }: {
    model: any;
    itemId: number;
    dataUpdated: any;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const primaryKey = model.primaryKeyAttributes[0]; // tự động lấy primary key của model

        const [affectedCount] = await CrudHelper.updateByIds({
          model,
          whereCondition: { [primaryKey]: itemId },
          data: dataUpdated,
          transaction,
        });

        if (affectedCount === 0) {
          throw AppError.NotFound("item not found", "ITEM_NOT_FOUND");
        }

        return { message: "update item successfully", data: { itemId, ...dataUpdated } };
      });
    } catch (error) {
      console.error("update item failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteItem: async ({ model, itemId }: { model: any; itemId: number }) => {
    try {
      const existedItem = await CrudHelper.findByPk({ model, id: itemId });
      if (!existedItem) {
        throw AppError.NotFound("item not found ", "ITEM_NOT_FOUND");
      }

      await existedItem.destroy();

      return { message: "delete item successfully" };
    } catch (error) {
      console.error("delete item failed:", error);
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

  updateStatusOrder: async ({
    req,
    orderId,
    newStatus,
    rejectReason,
    senderId,
  }: {
    req: Request;
    orderId: string;
    newStatus: OrderStatus;
    rejectReason: string;
    senderId: number;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!["accept", "reject"].includes(newStatus)) {
          throw AppError.BadRequest("Invalid status", "INVALID_STATUS");
        }

        const order = await adminRepository.findByOrderId(orderId, transaction);
        if (!order) {
          throw AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
        }

        // const customer = order.Customer;
        // const newDebt = Number(customer.debtCurrent || 0) + Number(order.totalPrice || 0);

        const ownerId = order.userId;

        if (newStatus === "reject") {
          order.set({ status: newStatus, rejectReason: rejectReason || "" });

          const config = REQUEST_CONFIG["ORDER_REJECT"];
          if (!config) {
            throw AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
          }

          const user = await User.findOne({ where: { userId: senderId }, transaction });
          if (!user) {
            throw AppError.NotFound("User not found", "USER_NOT_FOUND");
          }

          const newNotif = await NotificationModel.create({
            title: config.titleCreate(),
            type: "ORDER_REJECT",
            targetType: "user",
            senderId,
            senderName: user.fullName,
            senderDept: user.department,
            payload: {
              orderId,
              reason: rejectReason,
              action: "RESPONSE",
              status: "pending",
            },
          });

          await UserNotifications.create({
            notificationId: newNotif.notificationId,
            receiverId: ownerId,
            receiverDept: order.User.department || null,
            isRead: false,
          });

          //socket
          req.io?.to(`user-${ownerId}`).emit("new-notification", newNotif);
        } else {
          //calculate debt limit of customer
          // if (req.user.role !== "admin") {
          //   if (newDebt > customer.debtLimit!) {
          //     throw AppError.BadRequest("Debt limit exceeded", "DEBT_LIMIT_EXCEEDED");
          //   }
          // }
          // await customer.update({ debtCurrent: newDebt });

          //check type product

          const phiKhac = order.Product.typeProduct == "Phí Khác";

          order.set({
            status: phiKhac ? "planning" : newStatus,
            rejectReason: null,
            dayApproved: new Date(),
          });

          let success;

          await OrderApproved.create({ orderId, approvedBy: req.user.fullName }, { transaction });

          if (phiKhac) {
            success = await Inventory.create(
              {
                totalQtyInbound: order.quantityCustomer,
                qtyInventory: order.quantityCustomer,
                valueInventory: order.totalPrice,
                orderId,
              },
              { transaction },
            );
          } else {
            success = await inventoryService.createNewInventory(orderId, transaction);
          }

          //--------------------MEILISEARCH-----------------------
          if (success) {
            const inventory = await inventoryRepository.syncInventoryForMeili(orderId, transaction);

            if (inventory) {
              const flattenData = meiliTransformer.inventory(inventory);
              await meiliService.syncOrUpdateMeiliData({
                indexKey: MEILI_INDEX.INVENTORIES,
                data: flattenData,
                transaction,
              });
            }
          }
        }

        await order.save({ transaction });

        //--------------------MEILISEARCH-----------------------
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.ORDERS,
          data: { orderSortValue: order.orderSortValue, status: newStatus },
          transaction,
          isUpdate: true,
        });

        return { message: "Order status updated successfully" };
      });
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

  updateUserRole: async (userId: number, newRole: userRole) => {
    try {
      return await runInTransaction(async (transaction) => {
        const validRoles = ["admin", "manager", "user"];
        if (!validRoles.includes(newRole)) {
          throw AppError.BadRequest("Invalid role provided", "INVALID_ROLE");
        }

        const user = await adminRepository.getUserByPk(userId, transaction);
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

        await user.save({ transaction });

        const sanitizedData = user.toJSON() as Record<string, any>;
        delete sanitizedData.password;

        return { message: "User role updated successfully", data: sanitizedData };
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatePermissions: async (userId: number, permissions: string | string[]) => {
    try {
      return await runInTransaction(async (transaction) => {
        // Validate permissions input
        if (!Array.isArray(permissions) || permissions.length === 0) {
          throw AppError.BadRequest("Invalid permissions format", "INVALID_PERMISSIONS_FORMAT");
        }

        // check valid permissions
        const invalid = permissions.filter((p) => !validPermissions.includes(p));
        if (invalid.length > 0) {
          throw AppError.BadRequest(
            `Invalid permissions: ${invalid.join(", ")}`,
            "INVALID_PERMISSIONS",
          );
        }

        const user = await adminRepository.getUserByPk(userId, transaction);
        if (!user) {
          throw AppError.NotFound("User not found", "USER_NOT_FOUND");
        }

        // Update user's permissions
        user.permissions = permissions;
        await user.save({ transaction });

        return { message: "Permissions updated successfully", data: user };
      });
    } catch (error) {
      console.error("Error updating permissions:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateUserDepartment: async (userId: number, newDepartment: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const user = await adminRepository.getUserByPk(userId, transaction);
        if (!user) {
          throw AppError.NotFound("User not found", "USER_NOT_FOUND");
        }

        user.department = newDepartment;
        await user.save({ transaction });

        return { message: "User department updated successfully", data: user };
      });
    } catch (error) {
      console.error("Error updating user department:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  resetPassword: async (userIds: number | number[], newPassword: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        if (!Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
          throw AppError.BadRequest(
            "userIds must be a non-empty array and newPassword is required",
            "INVALID_INPUT",
          );
        }
        const saltPassword = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltPassword);

        // Tìm và cập nhật tất cả user
        const updatedUserIds = [];
        for (const id of userIds) {
          const user = await adminRepository.getUserByPk(id, transaction);
          if (user) {
            user.password = hashedPassword;
            await user.save({ transaction });
            updatedUserIds.push(user.userId);
          }
        }

        if (updatedUserIds.length === 0) {
          throw AppError.NotFound("users not found to update", "USER_NOT_FOUND");
        }

        return { message: "Passwords reset successfully" };
      });
    } catch (error) {
      console.error("Error resetting passwords:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteUserById: async (userId: number) => {
    try {
      return await runInTransaction(async (transaction) => {
        const user = await adminRepository.getUserByPk(userId, transaction);
        if (!user) {
          throw AppError.NotFound("User not found", "USER_NOT_FOUND");
        }

        // const imageName = user.avatar;

        // await user.destroy({ transaction });

        // if (imageName && imageName.includes("cloudinary.com")) {
        //   const publicId = getCloudinaryPublicId(imageName);
        //   if (publicId) {
        //     await cloudinary.uploader.destroy(publicId);
        //   }
        // }

        return { message: "User deleted successfully" };
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
