"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.deleteUserById = exports.updatePermissions = exports.updateUserRole = exports.getUserByPermission = exports.getUserByPhone = exports.getUserByName = exports.getAllUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_1 = require("../../models/user/user");
const connectCloudinary_1 = __importDefault(require("../../configs/connectCloudinary"));
const sequelize_1 = require("sequelize");
const machineLabels_1 = require("../../configs/machineLabels");
const converToWebp_1 = require("../../utils/image/converToWebp");
//get all users
const getAllUsers = async (req, res) => {
    try {
        const data = await user_1.User.findAll({ attributes: { exclude: ["password"] } });
        const sanitizedData = data
            .map((user) => user.get({ plain: true }))
            .filter((user) => user.role?.toLowerCase() !== "admin");
        res.status(200).json({
            message: "Get all users successfully (excluding admin)",
            data: sanitizedData,
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllUsers = getAllUsers;
//get user by name
const getUserByName = async (req, res) => {
    const { name } = req.query;
    const nameLower = name?.toLowerCase();
    if (!nameLower) {
        return res.status(400).json({ message: "Name is required" });
    }
    try {
        const users = await user_1.User.findAll({
            where: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("fullName")), {
                [sequelize_1.Op.like]: `%${nameLower}%`,
            }),
            attributes: { exclude: ["password"] },
        });
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const sanitizedUsers = users
            .map((user) => user.get({ plain: true }))
            .filter((user) => user.role?.toLowerCase() !== "admin");
        res.status(200).json({
            message: "Get all users from DB",
            data: sanitizedUsers,
        });
    }
    catch (error) {
        console.error("Error fetching user by name:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserByName = getUserByName;
//get user by phone
const getUserByPhone = async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
    }
    try {
        const users = await user_1.User.findAll({
            where: { phone: phone },
            attributes: { exclude: ["password"] },
        });
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const sanitizedUsers = users
            .map((user) => user.get({ plain: true }))
            .filter((user) => user.role?.toLowerCase() !== "admin");
        res.status(200).json({
            message: "Get user by phone from DB",
            data: sanitizedUsers,
        });
    }
    catch (error) {
        console.error("Error fetching user by phone:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserByPhone = getUserByPhone;
//get user by permission
const getUserByPermission = async (req, res) => {
    let { permission } = req.query;
    if (!permission) {
        return res.status(400).json({ message: "Permission is required" });
    }
    try {
        if (!Array.isArray(permission)) {
            permission = [permission]; // chuyển về dạng mảng nếu chỉ có 1 item
        }
        const lowerPermissions = permission.map((p) => p.toLowerCase()).filter(Boolean);
        const users = await user_1.User.findAll({ attributes: { exclude: ["password"] } });
        const matchedUsers = users.filter((user) => {
            const perms = Array.isArray(user.permissions)
                ? user.permissions
                : JSON.parse(user.permissions || "[]");
            return perms.some((perm) => lowerPermissions.includes(perm.toLowerCase()));
        });
        const sanitizedUsers = matchedUsers
            .map((user) => user.get({ plain: true }))
            .filter((user) => user.role?.toLowerCase() !== "admin");
        return res.status(200).json({
            message: "Get users by permission from DB",
            data: sanitizedUsers,
        });
    }
    catch (error) {
        console.error("Error fetching users by permission:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getUserByPermission = getUserByPermission;
//update role of user
const updateUserRole = async (req, res) => {
    const { userId, newRole } = req.query;
    if (!userId || !newRole) {
        return res.status(400).json({ message: "Missing userId or newRole" });
    }
    try {
        const validRoles = ["admin", "manager", "user"];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ message: "Invalid role provided" });
        }
        const user = await user_1.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
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
        res.status(200).json({
            message: "User role updated successfully",
            data: sanitizedData,
        });
    }
    catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateUserRole = updateUserRole;
//update permissions of user
const updatePermissions = async (req, res) => {
    const { userId } = req.query;
    const { permissions } = req.body;
    const id = Number(userId);
    // Validate permissions input
    if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({ message: "Invalid permissions format" });
    }
    // check valid permissions
    const invalid = permissions.filter((p) => !machineLabels_1.validPermissions.includes(p));
    if (invalid.length > 0) {
        return res.status(400).json({
            message: `Invalid permissions: ${invalid.join(", ")}`,
        });
    }
    try {
        const user = await user_1.User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Update user's permissions
        user.permissions = permissions;
        await user.save();
        res.status(200).json({
            message: "Permissions updated successfully",
            userId: user.userId,
            permissions: user.permissions,
        });
    }
    catch (error) {
        console.error("Error updating permissions:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updatePermissions = updatePermissions;
//delete user
const deleteUserById = async (req, res) => {
    const { userId } = req.query;
    const id = Number(userId);
    try {
        const user = await user_1.User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const imageName = user.avatar;
        await user.destroy();
        if (imageName && imageName.includes("cloudinary.com")) {
            const publicId = (0, converToWebp_1.getCloudinaryPublicId)(imageName);
            if (publicId) {
                await connectCloudinary_1.default.uploader.destroy(publicId);
            }
        }
        res.status(200).json({
            message: "User deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteUserById = deleteUserById;
//reset-password
const resetPassword = async (req, res) => {
    const { userIds } = req.body;
    const { newPassword } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
        return res.status(400).json({
            message: "userIds must be a non-empty array and newPassword is required",
        });
    }
    try {
        const saltPassword = 10;
        const hashedPassword = await bcrypt_1.default.hash(newPassword, saltPassword);
        // Tìm và cập nhật tất cả user
        const updatedUserIds = [];
        for (const id of userIds) {
            const user = await user_1.User.findByPk(id);
            if (user) {
                user.password = hashedPassword;
                await user.save();
                updatedUserIds.push(user.userId);
            }
        }
        if (updatedUserIds.length === 0) {
            return res.status(404).json({ message: "users not found to update" });
        }
        res.status(200).json({
            message: "Passwords reset successfully",
        });
    }
    catch (error) {
        console.error("Error resetting passwords:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=adminUserController.js.map