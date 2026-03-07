"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateInfoUser = exports.getUsersAdmin = void 0;
const adminService_1 = require("../../service/admin/adminService");
const getUsersAdmin = async (req, res, next) => {
    const { name, phone, permissions } = req.query;
    try {
        let response;
        if (name) {
            response = await adminService_1.adminService.getUsersAdmin("name", name);
        }
        else if (phone) {
            response = await adminService_1.adminService.getUsersAdmin("phone", phone);
        }
        else if (permissions) {
            response = await adminService_1.adminService.getUsersAdmin("permission", permissions);
        }
        else {
            response = await adminService_1.adminService.getAllUsers();
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUsersAdmin = getUsersAdmin;
const updateInfoUser = async (req, res, next) => {
    const { userId, newRole } = req.query;
    const { permissions, userIds, newPassword } = req.body;
    try {
        let response;
        if (userId && newRole) {
            response = await adminService_1.adminService.updateUserRole(Number(userId), newRole);
        }
        else if (userId && permissions) {
            response = await adminService_1.adminService.updatePermissions(Number(userId), permissions);
        }
        else if (userIds && newPassword) {
            response = await adminService_1.adminService.resetPassword(userIds, newPassword);
        }
        else {
            return res.status(400).json({ message: "Invalid update parameters" });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateInfoUser = updateInfoUser;
//delete user
const deleteUser = async (req, res, next) => {
    const { userId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteUserById(Number(userId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=adminUserController.js.map