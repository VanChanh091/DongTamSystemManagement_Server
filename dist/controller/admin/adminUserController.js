"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.deleteUserById = exports.updatePermissions = exports.updateUserRole = exports.getUserByPermission = exports.getUserByPhone = exports.getUserByName = exports.getAllUsers = void 0;
const adminService_1 = require("../../service/adminService");
//get all users
const getAllUsers = async (req, res) => {
    try {
        const response = await adminService_1.adminService.getAllUsers();
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllUsers = getAllUsers;
//get user by name
const getUserByName = async (req, res) => {
    const { name } = req.query;
    const nameLower = name?.toLowerCase();
    try {
        const response = await adminService_1.adminService.getUserByName(nameLower);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getUserByName = getUserByName;
//get user by phone
const getUserByPhone = async (req, res) => {
    const { phone } = req.query;
    try {
        const response = await adminService_1.adminService.getUserByPhone(phone);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getUserByPhone = getUserByPhone;
//get user by permission
const getUserByPermission = async (req, res) => {
    let { permission } = req.query;
    try {
        const response = await adminService_1.adminService.getUserByPermission(permission);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getUserByPermission = getUserByPermission;
//update role of user
const updateUserRole = async (req, res) => {
    const { userId, newRole } = req.query;
    try {
        const response = await adminService_1.adminService.updateUserRole(Number(userId), newRole);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateUserRole = updateUserRole;
//update permissions of user
const updatePermissions = async (req, res) => {
    const { userId } = req.query;
    const { permissions } = req.body;
    try {
        const response = await adminService_1.adminService.updatePermissions(Number(userId), permissions);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updatePermissions = updatePermissions;
//delete user
const deleteUserById = async (req, res) => {
    const { userId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteUserById(Number(userId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteUserById = deleteUserById;
//reset-password
const resetPassword = async (req, res) => {
    const { userIds, newPassword } = req.body;
    try {
        const response = await adminService_1.adminService.resetPassword(userIds, newPassword);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=adminUserController.js.map