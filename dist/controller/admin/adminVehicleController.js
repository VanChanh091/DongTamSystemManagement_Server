"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.updateVehicle = exports.createNewVehicle = exports.getAllVehicle = void 0;
const vehicle_1 = require("../../models/admin/vehicle");
const adminService_1 = require("../../service/admin/adminService");
const getAllVehicle = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: vehicle_1.Vehicle,
            message: "get all vehicle successfully",
        });
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
            message: "Create vehicle successfully",
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
            message: "update vehicle successfully",
            errMessage: "vehicle not found",
            errCode: "VEHICLE_NOT_FOUND",
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
            message: "delete vehicle successfully",
            errMessage: "vehicle not found",
            errCode: "VEHICLE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteVehicle = deleteVehicle;
//# sourceMappingURL=adminVehicleController.js.map