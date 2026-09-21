"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWaveCrest = exports.updateWaveCrest = exports.createWaveCrest = exports.getWaveCrestCoefficient = exports.deleteVehicle = exports.updateVehicle = exports.createNewVehicle = exports.getAllVehicle = exports.deleteUser = exports.updateInfoUser = exports.getUsersAdmin = exports.deleteFluteRatio = exports.updateFluteRatio = exports.createFluteRatio = exports.getAllFluteRatio = exports.deleteCriteria = exports.updateCriteria = exports.createNewCriteria = exports.getAllQcCriteria = exports.deleteCriteriaCheck = exports.updateCriteriaCheck = exports.createNewCriteriaCheck = exports.getAllCriteriaCheck = exports.updateStatusAdmin = exports.getOrderPending = void 0;
const adminCriteriaCheckService_1 = require("../../service/admin/adminCriteriaCheckService");
const adminService_1 = require("../../service/admin/adminService");
const adminCriteriaService_1 = require("../../service/admin/adminCriteriaService");
const fluteRatio_1 = require("../../models/admin/fluteRatio");
const vehicle_1 = require("../../models/admin/vehicle");
const waveCrestCoefficient_1 = require("../../models/admin/waveCrestCoefficient");
// ================================ ORDER ====================================
//getOrderPending
const getOrderPending = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getOrderPending();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderPending = getOrderPending;
//accept or reject order
const updateStatusAdmin = async (req, res, next) => {
    const { id } = req.query;
    const { newStatus, rejectReason } = req.body;
    try {
        const response = await adminService_1.adminService.updateStatusOrder({
            req,
            orderId: id,
            newStatus,
            rejectReason,
            senderId: req.user.userId,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateStatusAdmin = updateStatusAdmin;
// ============================= CRITERIA CHECK PAPER/BOX =================================
//get all criteria check
const getAllCriteriaCheck = async (req, res, next) => {
    const { isPaper, machine } = req.query;
    try {
        const response = await adminCriteriaCheckService_1.adminCriteriaCheckService.getAllCriteriaCheck(isPaper, machine);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCriteriaCheck = getAllCriteriaCheck;
//create new criteria check
const createNewCriteriaCheck = async (req, res, next) => {
    const { isPaper } = req.query;
    try {
        const response = await adminCriteriaCheckService_1.adminCriteriaCheckService.createNewCriteriaCheck(req.body, isPaper);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewCriteriaCheck = createNewCriteriaCheck;
//update criteria check
const updateCriteriaCheck = async (req, res, next) => {
    const { criteriaId, isPaper } = req.query;
    try {
        const response = await adminCriteriaCheckService_1.adminCriteriaCheckService.updateCriteriaCheck(Number(criteriaId), req.body, isPaper);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCriteriaCheck = updateCriteriaCheck;
//delete criteria check
const deleteCriteriaCheck = async (req, res, next) => {
    const { criteriaId, isPaper } = req.query;
    try {
        const response = await adminCriteriaCheckService_1.adminCriteriaCheckService.deleteCriteriaCheck(Number(criteriaId), isPaper);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCriteriaCheck = deleteCriteriaCheck;
// ============================= CRITERIA =================================
//get all qc criteria
const getAllQcCriteria = async (req, res, next) => {
    const { type } = req.query;
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.getAllQcCriteria(type);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQcCriteria = getAllQcCriteria;
//create new qc criteria
const createNewCriteria = async (req, res, next) => {
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.createNewCriteria(req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewCriteria = createNewCriteria;
//update qc criteria
const updateCriteria = async (req, res, next) => {
    const { qcCriteriaId } = req.query;
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.updateCriteria(Number(qcCriteriaId), req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCriteria = updateCriteria;
//delete qc criteria
const deleteCriteria = async (req, res, next) => {
    const { qcCriteriaId } = req.query;
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.deleteCriteria(Number(qcCriteriaId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCriteria = deleteCriteria;
// ============================= FLUTE RATIO =================================
const getAllFluteRatio = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({ model: fluteRatio_1.FluteRatio });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllFluteRatio = getAllFluteRatio;
const createFluteRatio = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: fluteRatio_1.FluteRatio,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createFluteRatio = createFluteRatio;
const updateFluteRatio = async (req, res, next) => {
    const { fluteRatioId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: fluteRatio_1.FluteRatio,
            itemId: Number(fluteRatioId),
            dataUpdated: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateFluteRatio = updateFluteRatio;
const deleteFluteRatio = async (req, res, next) => {
    const { fluteRatioId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: fluteRatio_1.FluteRatio,
            itemId: Number(fluteRatioId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFluteRatio = deleteFluteRatio;
// ============================= USER =================================
const getUsersAdmin = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllUsers();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUsersAdmin = getUsersAdmin;
const updateInfoUser = async (req, res, next) => {
    const { userId, newRole } = req.query;
    const { permissions, userIds, newPassword, newDepartment } = req.body;
    try {
        let response;
        if (userId && newRole) {
            response = await adminService_1.adminService.updateUserRole(Number(userId), newRole);
        }
        else if (userId && permissions) {
            response = await adminService_1.adminService.updatePermissions(Number(userId), permissions);
        }
        else if (userId && newDepartment) {
            response = await adminService_1.adminService.updateUserDepartment(Number(userId), newDepartment);
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
// ============================= VEHICLE =================================
const getAllVehicle = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({ model: vehicle_1.Vehicle });
        // Kiểm tra xem dữ liệu trả về có phải là mảng không để tránh lỗi crash
        if (response && Array.isArray(response.data)) {
            response.data.sort((a, b) => {
                // 1. So sánh theo nhà xe (vehicleHouse) trước
                // Dùng || "" để phòng trường hợp dữ liệu trong DB bị null/undefined
                const houseCompare = (b.vehicleHouse || "").localeCompare(a.vehicleHouse || "", "vi", {
                    sensitivity: "base",
                });
                // Nếu nhà xe khác nhau thì trả về kết quả luôn
                if (houseCompare !== 0) {
                    return houseCompare;
                }
                // 2. Nếu trùng nhà xe, so sánh tiếp đến tên xe (vehicleName)
                // Bật numeric: true để xử lý sắp xếp tự nhiên các số (Tấn 1, Tấn 2, Tấn 10...)
                return (a.vehicleName || "").localeCompare(b.vehicleName || "", "vi", {
                    numeric: true,
                    sensitivity: "base",
                });
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllVehicle = getAllVehicle;
const createNewVehicle = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: vehicle_1.Vehicle,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewVehicle = createNewVehicle;
const updateVehicle = async (req, res, next) => {
    const { vehicleId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: vehicle_1.Vehicle,
            itemId: Number(vehicleId),
            dataUpdated: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateVehicle = updateVehicle;
const deleteVehicle = async (req, res, next) => {
    const { vehicleId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: vehicle_1.Vehicle,
            itemId: Number(vehicleId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteVehicle = deleteVehicle;
// ============================= WAVE CREST =================================
const getWaveCrestCoefficient = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        let response;
        if (waveCrestId) {
            response = await adminService_1.adminService.getItemById({
                model: waveCrestCoefficient_1.WaveCrestCoefficient,
                itemId: Number(waveCrestId),
            });
        }
        else {
            response = await adminService_1.adminService.getAllItems({
                model: waveCrestCoefficient_1.WaveCrestCoefficient,
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWaveCrestCoefficient = getWaveCrestCoefficient;
//add wave crest coefficient
const createWaveCrest = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createWaveCrest = createWaveCrest;
//update wave crest coefficient
const updateWaveCrest = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            itemId: Number(waveCrestId),
            dataUpdated: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWaveCrest = updateWaveCrest;
//delete wave crest coefficient
const deleteWaveCrest = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            itemId: Number(waveCrestId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteWaveCrest = deleteWaveCrest;
//# sourceMappingURL=adminController.js.map