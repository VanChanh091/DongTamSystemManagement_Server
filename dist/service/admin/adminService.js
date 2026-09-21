"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bcrypt_1 = __importDefault(require("bcrypt"));
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const user_1 = require("../../models/user/user");
const adminRepository_1 = require("../../repository/adminRepository");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const labelFields_1 = require("../../assets/labelFields");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const inventoryService_1 = require("../inventory/inventoryService");
const orderApproved_1 = require("../../models/order/orderApproved");
const notification_1 = require("../../models/notification/notification");
const requestType_1 = require("../notification/requestType");
const userNotifications_1 = require("../../models/notification/userNotifications");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const devEnvironment = process.env.NODE_ENV !== "production";
exports.adminService = {
    //===============================ADMIN CRUD=====================================
    getAllItems: async ({ model, options }) => {
        try {
            const allItems = await crud_helper_repository_1.CrudHelper.findAll({ model, options });
            return { message: "get all items successfully", data: allItems };
        }
        catch (error) {
            console.error("get all item failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getItemById: async ({ model, itemId, options, }) => {
        try {
            const item = await crud_helper_repository_1.CrudHelper.findByPk({ model, id: itemId, options });
            if (!item) {
                throw appError_1.AppError.NotFound("item not found", "ITEM_NOT_FOUND");
            }
            return { message: `get item by id: ${itemId}`, data: item };
        }
        catch (error) {
            console.error(`failed to get item by id: ${itemId}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createNewItem: async ({ model, data }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const newItem = await crud_helper_repository_1.CrudHelper.createData({ model, data, transaction });
                return { message: "create item successfully", data: newItem };
            });
        }
        catch (error) {
            console.error("create item failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateItem: async ({ model, itemId, dataUpdated, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const primaryKey = model.primaryKeyAttributes[0]; // tự động lấy primary key của model
                const [affectedCount] = await crud_helper_repository_1.CrudHelper.updateData({
                    model,
                    data: dataUpdated,
                    options: { where: { [primaryKey]: itemId }, transaction },
                });
                if (affectedCount === 0) {
                    throw appError_1.AppError.NotFound("item not found", "ITEM_NOT_FOUND");
                }
                return { message: "update item successfully", data: { itemId, ...dataUpdated } };
            });
        }
        catch (error) {
            console.error("update item failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteItem: async ({ model, itemId }) => {
        try {
            const existedItem = await crud_helper_repository_1.CrudHelper.findByPk({ model, id: itemId });
            if (!existedItem) {
                throw appError_1.AppError.NotFound("item not found ", "ITEM_NOT_FOUND");
            }
            await existedItem.destroy();
            return { message: "delete item successfully" };
        }
        catch (error) {
            console.error("delete item failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //===============================ADMIN ORDER=====================================
    getOrderPending: async () => {
        try {
            const data = await adminRepository_1.adminRepository.findOrderPending();
            return { message: "get all order have status:pending", data };
        }
        catch (error) {
            console.error("failed to get order pending", error);
            throw appError_1.AppError.ServerError();
        }
    },
    updateStatusOrder: async ({ req, orderId, newStatus, rejectReason, senderId, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!["accept", "reject"].includes(newStatus)) {
                    throw appError_1.AppError.BadRequest("Invalid status", "INVALID_STATUS");
                }
                const order = await adminRepository_1.adminRepository.findByOrderId(orderId, transaction);
                if (!order) {
                    throw appError_1.AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
                }
                // const customer = order.Customer;
                // const newDebt = Number(customer.debtCurrent || 0) + Number(order.totalPrice || 0);
                const ownerId = order.userId;
                if (newStatus === "reject") {
                    order.set({ status: newStatus, rejectReason: rejectReason || "" });
                    const config = requestType_1.REQUEST_CONFIG["ORDER_REJECT"];
                    if (!config) {
                        throw appError_1.AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
                    }
                    const user = await user_1.User.findOne({ where: { userId: senderId }, transaction });
                    if (!user) {
                        throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
                    }
                    const newNotif = await notification_1.NotificationModel.create({
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
                    await userNotifications_1.UserNotifications.create({
                        notificationId: newNotif.notificationId,
                        receiverId: ownerId,
                        receiverDept: order.User.department || null,
                        isRead: false,
                    });
                    //socket
                    req.io?.to(`user-${ownerId}`).emit("new-notification", newNotif);
                }
                else {
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
                    await orderApproved_1.OrderApproved.create({ orderId, approvedBy: req.user.fullName }, { transaction });
                    if (phiKhac) {
                        success = await inventory_1.Inventory.create({
                            totalQtyInbound: order.quantityCustomer,
                            qtyInventory: order.quantityCustomer,
                            valueInventory: order.totalPrice,
                            orderId,
                        }, { transaction });
                    }
                    else {
                        success = await inventoryService_1.inventoryService.createNewInventory(orderId, transaction);
                    }
                    //--------------------MEILISEARCH-----------------------
                    if (success) {
                        const inventory = await inventoryRepository_1.inventoryRepository.syncInventoryForMeili(orderId, transaction);
                        if (inventory) {
                            const flattenData = meiliTransformer_1.meiliTransformer.inventory(inventory);
                            await meiliService_1.meiliService.syncOrUpdateMeiliData({
                                indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                                data: flattenData,
                                transaction,
                            });
                        }
                    }
                }
                await order.save({ transaction });
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                    data: { orderSortValue: order.orderSortValue, status: newStatus },
                    transaction,
                    isUpdate: true,
                });
                return { message: "Order status updated successfully" };
            });
        }
        catch (error) {
            console.error("failed to update order", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //===============================ADMIN USER======================================
    getAllUsers: async () => {
        try {
            const data = await adminRepository_1.adminRepository.getAllUser();
            const sanitizedData = data
                .map((user) => user.get({ plain: true }))
                .filter((user) => user.role?.toLowerCase() !== "admin");
            return { message: "Get all users successfully (excluding admin)", data: sanitizedData };
        }
        catch (error) {
            console.error("Error fetching users:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    updateUserRole: async (userId, newRole) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const validRoles = ["admin", "manager", "user"];
                if (!validRoles.includes(newRole)) {
                    throw appError_1.AppError.BadRequest("Invalid role provided", "INVALID_ROLE");
                }
                const user = await adminRepository_1.adminRepository.getUserByPk(userId, transaction);
                if (!user) {
                    throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
                }
                user.role = newRole;
                if (newRole === "admin") {
                    user.permissions = ["all"];
                }
                else if (newRole === "manager") {
                    user.permissions = ["manager"];
                }
                else {
                    user.permissions = ["read"];
                }
                await user.save({ transaction });
                const sanitizedData = user.toJSON();
                delete sanitizedData.password;
                return { message: "User role updated successfully", data: sanitizedData };
            });
        }
        catch (error) {
            console.error("Error updating user role:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updatePermissions: async (userId, permissions) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Validate permissions input
                if (!Array.isArray(permissions) || permissions.length === 0) {
                    throw appError_1.AppError.BadRequest("Invalid permissions format", "INVALID_PERMISSIONS_FORMAT");
                }
                // check valid permissions
                const invalid = permissions.filter((p) => !labelFields_1.validPermissions.includes(p));
                if (invalid.length > 0) {
                    throw appError_1.AppError.BadRequest(`Invalid permissions: ${invalid.join(", ")}`, "INVALID_PERMISSIONS");
                }
                const user = await adminRepository_1.adminRepository.getUserByPk(userId, transaction);
                if (!user) {
                    throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
                }
                // Update user's permissions
                user.permissions = permissions;
                await user.save({ transaction });
                return { message: "Permissions updated successfully", data: user };
            });
        }
        catch (error) {
            console.error("Error updating permissions:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateUserDepartment: async (userId, newDepartment) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const user = await adminRepository_1.adminRepository.getUserByPk(userId, transaction);
                if (!user) {
                    throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
                }
                user.department = newDepartment;
                await user.save({ transaction });
                return { message: "User department updated successfully", data: user };
            });
        }
        catch (error) {
            console.error("Error updating user department:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    resetPassword: async (userIds, newPassword) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
                    throw appError_1.AppError.BadRequest("userIds must be a non-empty array and newPassword is required", "INVALID_INPUT");
                }
                const saltPassword = 10;
                const hashedPassword = await bcrypt_1.default.hash(newPassword, saltPassword);
                // Tìm và cập nhật tất cả user
                const updatedUserIds = [];
                for (const id of userIds) {
                    const user = await adminRepository_1.adminRepository.getUserByPk(id, transaction);
                    if (user) {
                        user.password = hashedPassword;
                        await user.save({ transaction });
                        updatedUserIds.push(user.userId);
                    }
                }
                if (updatedUserIds.length === 0) {
                    throw appError_1.AppError.NotFound("users not found to update", "USER_NOT_FOUND");
                }
                return { message: "Passwords reset successfully" };
            });
        }
        catch (error) {
            console.error("Error resetting passwords:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteUserById: async (userId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const user = await adminRepository_1.adminRepository.getUserByPk(userId, transaction);
                if (!user) {
                    throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
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
        }
        catch (error) {
            console.error("Error deleting user:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=adminService.js.map