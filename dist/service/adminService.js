"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const connectCloudinary_1 = __importDefault(require("../configs/connectCloudinary"));
const machineLabels_1 = require("../configs/machineLabels");
const adminRepository_1 = require("../repository/adminRepository");
const appError_1 = require("../utils/appError");
const converToWebp_1 = require("../utils/image/converToWebp");
const waveCrestCoefficient_1 = require("../models/admin/waveCrestCoefficient");
exports.adminService = {
    //===============================ADMIN MACHINE=====================================
    getAllMachine: async (model) => {
        try {
            const result = await adminRepository_1.adminRepository.getAllMachine(model);
            return { message: "get all machine successfully", data: result };
        }
        catch (error) {
            console.error("failed to get all machine: ", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getMachineById: async (model, machineId) => {
        try {
            const machine = await adminRepository_1.adminRepository.getMachineByPk(model, machineId);
            if (!machine) {
                throw appError_1.AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
            }
            return { message: `get machine by id: ${machineId}`, data: machine };
        }
        catch (error) {
            console.error(`failed to get machine by id: ${machineId}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createMachine: async (model, data) => {
        const transaction = await model.sequelize?.transaction();
        try {
            const newMachine = await adminRepository_1.adminRepository.createMachine(model, data, transaction);
            await transaction?.commit();
            return { message: "Create machine successfully", data: newMachine };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("❌ Failed to create machine:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    updateMachineById: async (model, machineId, machineUpdated) => {
        try {
            const existingMachine = await adminRepository_1.adminRepository.getMachineByPk(model, machineId);
            if (!existingMachine) {
                throw appError_1.AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
            }
            await existingMachine.update({
                ...machineUpdated,
            });
            return { message: "update machine successfully", data: existingMachine };
        }
        catch (error) {
            console.error("failed to update machine", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteMachineById: async (model, machineId) => {
        try {
            const machine = await adminRepository_1.adminRepository.getMachineByPk(model, machineId);
            if (!machine) {
                throw appError_1.AppError.NotFound("machine not found", "MACHINE_NOT_FOUND");
            }
            await machine.destroy();
            return { message: `delete machineId: ${machineId} successfully` };
        }
        catch (error) {
            console.error("failed to delete machine", error);
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
    updateStatusOrder: async (orderId, newStatus, rejectReason) => {
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
            return { message: "Order status updated successfully", order };
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
            if (!userId || !newRole) {
                throw appError_1.AppError.BadRequest("Missing userId or newRole", "MISSING_PARAMETERS");
            }
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
    //===============================ADMIN WASTE NORM=====================================
    getAllWaste: async (model) => {
        try {
            const data = await adminRepository_1.adminRepository.getAllWaste(model);
            return { message: "get all waste successfully", data };
        }
        catch (error) {
            console.error("failed to get all waste", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getWasteById: async (model, wasteId) => {
        try {
            const wasteNorm = await adminRepository_1.adminRepository.getWasteByPk(model, wasteId);
            if (!wasteNorm) {
                throw appError_1.AppError.NotFound("wasteId not found", "WASTE_NOT_FOUND");
            }
            return { message: `get waste by wasteId: ${wasteId}`, data: wasteNorm };
        }
        catch (error) {
            console.error(`failed to get wasteId: ${wasteId}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createWaste: async (model, data) => {
        const transaction = await model.sequelize?.transaction();
        try {
            const newWasteNorm = await adminRepository_1.adminRepository.createWaste(model, data, transaction);
            await transaction?.commit();
            return { message: "create waste successfully", data: newWasteNorm };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("failed to create waste", error);
            throw appError_1.AppError.ServerError();
        }
    },
    updateWaste: async (model, wasteId, wasteNormUpdated) => {
        try {
            const existingWasteNorm = await adminRepository_1.adminRepository.getWasteByPk(model, wasteId);
            if (!existingWasteNorm) {
                throw appError_1.AppError.NotFound("waste norm not found", "WASTE_NOT_FOUND");
            }
            await adminRepository_1.adminRepository.updateWaste(existingWasteNorm, { ...wasteNormUpdated });
            return { message: "update waste norm successfully", data: existingWasteNorm };
        }
        catch (error) {
            console.error("failed to update waste norm", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteWaste: async (model, wasteId) => {
        try {
            const wasteNorm = await adminRepository_1.adminRepository.getWasteByPk(model, wasteId);
            if (!wasteNorm) {
                throw appError_1.AppError.NotFound("waste norm not found", "WASTE_NOT_FOUND");
            }
            await wasteNorm.destroy();
            return { message: `delete wasteNormId: ${wasteId} successfully` };
        }
        catch (error) {
            console.error("failed to delete waste norm", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //===============================ADMIN WASTE CREST=====================================
    getAllWaveCrestCoefficient: async () => {
        try {
            const data = await adminRepository_1.adminRepository.getAllWaste(waveCrestCoefficient_1.WaveCrestCoefficient);
            return { message: "get all wave crest coefficient successfully", data };
        }
        catch (error) {
            console.error("failed to get all wave crest coefficient", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getWaveCrestById: async (wasteId) => {
        try {
            const wasteNorm = await adminRepository_1.adminRepository.getWasteByPk(waveCrestCoefficient_1.WaveCrestCoefficient, wasteId);
            if (!wasteNorm) {
                throw appError_1.AppError.NotFound("wave crest not found", "WAVE_CREST_NOT_FOUND");
            }
            return { message: `get wave crest by waveCrestId: ${wasteId}`, data: wasteNorm };
        }
        catch (error) {
            console.error(`failed to get wave crest by waveCrestId: ${wasteId}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createWaveCrestCoefficient: async (data) => {
        const transaction = await waveCrestCoefficient_1.WaveCrestCoefficient.sequelize?.transaction();
        try {
            const newWasteNorm = await adminRepository_1.adminRepository.createWaste(waveCrestCoefficient_1.WaveCrestCoefficient, data, transaction);
            await transaction?.commit();
            return { message: "create wave crest coefficient successfully", data: newWasteNorm };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("failed to create wave crest coefficient", error);
            throw appError_1.AppError.ServerError();
        }
    },
    updateWaveCrestById: async (wasteId, wasteNormUpdated) => {
        try {
            const existingWasteNorm = await adminRepository_1.adminRepository.getWasteByPk(waveCrestCoefficient_1.WaveCrestCoefficient, wasteId);
            if (!existingWasteNorm) {
                throw appError_1.AppError.NotFound("wave crest coefficient not found", "WAVE_CREST_COEFF_NOT_FOUND");
            }
            await adminRepository_1.adminRepository.updateWaste(existingWasteNorm, { ...wasteNormUpdated });
            return { message: "update wave crest coefficient successfully", data: existingWasteNorm };
        }
        catch (error) {
            console.error("failed to update wave crest coefficient", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deleteWaveCrestById: async (wasteId) => {
        try {
            const wasteNorm = await adminRepository_1.adminRepository.getWasteByPk(waveCrestCoefficient_1.WaveCrestCoefficient, wasteId);
            if (!wasteNorm) {
                throw appError_1.AppError.NotFound("wave crest coefficient not found", "WAVE_CREST_COEFF_NOT_FOUND");
            }
            await wasteNorm.destroy();
            return { message: `delete waveCrestCoefficientId: ${wasteId} successfully` };
        }
        catch (error) {
            console.error("failed to delete wave crest coefficient", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=adminService.js.map