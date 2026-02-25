"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bcrypt_1 = __importDefault(require("bcrypt"));
const connectCloudinary_1 = __importDefault(require("../../assest/configs/connectCloudinary"));
const machineLabels_1 = require("../../assest/configs/machineLabels");
const order_1 = require("../../models/order/order");
const adminRepository_1 = require("../../repository/adminRepository");
const appError_1 = require("../../utils/appError");
const converToWebp_1 = require("../../utils/image/converToWebp");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const devEnvironment = process.env.NODE_ENV !== "production";
exports.adminService = {
    //===============================ADMIN CRUD=====================================
    getAllItems: async ({ model, message }) => {
        try {
            const allItems = await adminRepository_1.adminRepository.getAllItems({ model });
            return { message, data: allItems };
        }
        catch (error) {
            console.error("get all item failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getItemById: async ({ model, itemId, errMessage, errCode, }) => {
        try {
            const item = await adminRepository_1.adminRepository.getItemByPk({ model, itemId });
            if (!item) {
                throw appError_1.AppError.NotFound(errMessage, errCode);
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
    createNewItem: async ({ model, data, message }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const newItem = await adminRepository_1.adminRepository.createNewItem({
                    model,
                    data,
                    transaction,
                });
                return { message, data: newItem };
            });
        }
        catch (error) {
            console.error("create item failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateItem: async ({ model, itemId, dataUpdated, message, errMessage, errCode, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existedItem = await adminRepository_1.adminRepository.getItemByPk({ model, itemId });
                if (!existedItem) {
                    throw appError_1.AppError.NotFound(errMessage, errCode);
                }
                await adminRepository_1.adminRepository.updateItem({
                    model: existedItem,
                    dataUpdated,
                    transaction,
                });
                return { message };
            });
        }
        catch (error) {
            console.error("update item failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteItem: async ({ model, itemId, message, errMessage, errCode, }) => {
        try {
            const existedItem = await adminRepository_1.adminRepository.getItemByPk({ model, itemId });
            if (!existedItem) {
                throw appError_1.AppError.NotFound(errMessage, errCode);
            }
            await adminRepository_1.adminRepository.deleteItem({ model: existedItem });
            return { message };
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
    updateStatusOrder: async (req, orderId, newStatus, rejectReason) => {
        try {
            if (!["accept", "reject"].includes(newStatus)) {
                throw appError_1.AppError.BadRequest("Invalid status", "INVALID_STATUS");
            }
            const order = await adminRepository_1.adminRepository.findByOrderId(orderId);
            if (!order) {
                throw appError_1.AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
            }
            // const customer = order.Customer;
            // const newDebt = Number(customer.debtCurrent || 0) + Number(order.totalPrice || 0);
            if (newStatus === "reject") {
                order.set({ status: newStatus, rejectReason: rejectReason || "" });
            }
            else {
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
            const ownerId = order.userId;
            const badgeCount = await order_1.Order.count({ where: { status: "reject", userId: ownerId } });
            const roomName = `reject-order-${ownerId}`;
            const sockets = await req.io?.in(roomName).fetchSockets();
            // console.log(`-----------------------------------`);
            // console.log(`📡 Event: updateBadgeCount`);
            // console.log(`🏠 Room Target: ${roomName}`);
            // console.log(`👥 Active sockets: ${sockets?.length ?? 0}`);
            // console.log(`-----------------------------------`);
            const hasSocket = sockets && sockets.length > 0;
            if (!hasSocket) {
                if (devEnvironment) {
                    console.log(`⚠️ No one is in room ${roomName}, skip emitting.`);
                }
                return { message: "Order status updated successfully, no active socket to notify" };
            }
            req.io?.to(roomName).emit("updateBadgeCount", {
                type: "REJECTED_ORDER",
                count: badgeCount,
            });
            return {
                message: "Order status updated successfully",
                notification: {
                    recipientId: ownerId,
                    badgeCount,
                },
            };
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
    getUserByName: async (name) => {
        try {
            if (!name) {
                throw appError_1.AppError.BadRequest("Name is required", "NAME_REQUIRED");
            }
            const users = await adminRepository_1.adminRepository.getUserByName(name);
            if (users.length === 0) {
                throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
            }
            const sanitizedUsers = users
                .map((user) => user.get({ plain: true }))
                .filter((user) => user.role?.toLowerCase() !== "admin");
            return { message: "Get all users by name from DB", data: sanitizedUsers };
        }
        catch (error) {
            console.error("Error fetching user by name:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getUserByPhone: async (phone) => {
        try {
            if (!phone) {
                throw appError_1.AppError.BadRequest("Phone number is required", "PHONE_REQUIRED");
            }
            const users = await adminRepository_1.adminRepository.getUserByPhone(phone);
            if (users.length === 0) {
                throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
            }
            const sanitizedUsers = users
                .map((user) => user.get({ plain: true }))
                .filter((user) => user.role?.toLowerCase() !== "admin");
            return { message: "Get user by phone from DB", data: sanitizedUsers };
        }
        catch (error) {
            console.error("Error fetching user by phone:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getUserByPermission: async (permission) => {
        try {
            if (!permission) {
                throw appError_1.AppError.BadRequest("Permission is required", "PERMISSION_REQUIRED");
            }
            if (!Array.isArray(permission)) {
                permission = [permission]; // chuyển về dạng mảng nếu chỉ có 1 item
            }
            const lowerPermissions = permission.map((p) => p.toLowerCase()).filter(Boolean);
            const users = await adminRepository_1.adminRepository.getAllUser();
            const matchedUsers = users.filter((user) => {
                const perms = Array.isArray(user.permissions)
                    ? user.permissions
                    : JSON.parse(user.permissions || "[]");
                return perms.some((perm) => lowerPermissions.includes(perm.toLowerCase()));
            });
            const sanitizedUsers = matchedUsers
                .map((user) => user.get({ plain: true }))
                .filter((user) => user.role?.toLowerCase() !== "admin");
            return { message: "Get users by permission from DB", data: sanitizedUsers };
        }
        catch (error) {
            console.error("Error fetching users by permission:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateUserRole: async (userId, newRole) => {
        try {
            const validRoles = ["admin", "manager", "user"];
            if (!validRoles.includes(newRole)) {
                throw appError_1.AppError.BadRequest("Invalid role provided", "INVALID_ROLE");
            }
            const user = await adminRepository_1.adminRepository.getUserByPk(userId);
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
            await user.save();
            const sanitizedData = user.toJSON();
            delete sanitizedData.password;
            return { message: "User role updated successfully", data: sanitizedData };
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
            // Validate permissions input
            if (!Array.isArray(permissions) || permissions.length === 0) {
                throw appError_1.AppError.BadRequest("Invalid permissions format", "INVALID_PERMISSIONS_FORMAT");
            }
            // check valid permissions
            const invalid = permissions.filter((p) => !machineLabels_1.validPermissions.includes(p));
            if (invalid.length > 0) {
                throw appError_1.AppError.BadRequest(`Invalid permissions: ${invalid.join(", ")}`, "INVALID_PERMISSIONS");
            }
            const user = await adminRepository_1.adminRepository.getUserByPk(userId);
            if (!user) {
                throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
            }
            // Update user's permissions
            user.permissions = permissions;
            await user.save();
            return {
                message: "Permissions updated successfully",
                userId: user.userId,
                permissions: user.permissions,
            };
        }
        catch (error) {
            console.error("Error updating permissions:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteUserById: async (userId) => {
        try {
            const user = await adminRepository_1.adminRepository.getUserByPk(userId);
            if (!user) {
                throw appError_1.AppError.NotFound("User not found", "USER_NOT_FOUND");
            }
            const imageName = user.avatar;
            await user.destroy();
            if (imageName && imageName.includes("cloudinary.com")) {
                const publicId = (0, converToWebp_1.getCloudinaryPublicId)(imageName);
                if (publicId) {
                    await connectCloudinary_1.default.uploader.destroy(publicId);
                }
            }
            return { message: "User deleted successfully" };
        }
        catch (error) {
            console.error("Error deleting user:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    resetPassword: async (userIds, newPassword) => {
        try {
            if (!Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
                throw appError_1.AppError.BadRequest("userIds must be a non-empty array and newPassword is required", "INVALID_INPUT");
            }
            const saltPassword = 10;
            const hashedPassword = await bcrypt_1.default.hash(newPassword, saltPassword);
            // Tìm và cập nhật tất cả user
            const updatedUserIds = [];
            for (const id of userIds) {
                const user = await adminRepository_1.adminRepository.getUserByPk(id);
                if (user) {
                    user.password = hashedPassword;
                    await user.save();
                    updatedUserIds.push(user.userId);
                }
            }
            if (updatedUserIds.length === 0) {
                throw appError_1.AppError.NotFound("users not found to update", "USER_NOT_FOUND");
            }
            return { message: "Passwords reset successfully" };
        }
        catch (error) {
            console.error("Error resetting passwords:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=adminService.js.map