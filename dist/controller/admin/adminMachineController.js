"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMachineBoxById = exports.updateMachineBoxById = exports.createMachineBox = exports.getMachineBoxById = exports.getAllMachineBox = exports.deleteMachinePaperById = exports.updateMachinePaperById = exports.createMachinePaper = exports.getMachinePaperById = exports.getAllMachinePaper = void 0;
const machinePaper_1 = require("../../models/admin/machinePaper");
const machineBox_1 = require("../../models/admin/machineBox");
const adminService_1 = require("../../service/admin/adminService");
//===============================PAPER=====================================
//get all machine
const getAllMachinePaper = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: machinePaper_1.MachinePaper,
            message: "get all machine paper successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllMachinePaper = getAllMachinePaper;
//get machine by id
//use to get id for update
const getMachinePaperById = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.getItemById({
            model: machinePaper_1.MachinePaper,
            itemId: Number(machineId),
            errMessage: "machine not found",
            errCode: "MACHINE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMachinePaperById = getMachinePaperById;
//add machine
const createMachinePaper = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: machinePaper_1.MachinePaper,
            data: req.body,
            message: "Create machine successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createMachinePaper = createMachinePaper;
//update machine
const updateMachinePaperById = async (req, res, next) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: machinePaper_1.MachinePaper,
            itemId: Number(machineId),
            dataUpdated: machineUpdated,
            message: "update machine successfully",
            errMessage: "machine not found",
            errCode: "MACHINE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMachinePaperById = updateMachinePaperById;
//delete machine
const deleteMachinePaperById = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: machinePaper_1.MachinePaper,
            itemId: Number(machineId),
            message: `delete machineId: ${machineId} successfully`,
            errMessage: "machine not found",
            errCode: "MACHINE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMachinePaperById = deleteMachinePaperById;
//===============================BOX=====================================
//get all machine
const getAllMachineBox = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: machineBox_1.MachineBox,
            message: "get all machine box successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllMachineBox = getAllMachineBox;
//get machine by id
//use to get id for update
const getMachineBoxById = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.getItemById({
            model: machineBox_1.MachineBox,
            itemId: Number(machineId),
            errMessage: "machine not found",
            errCode: "MACHINE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMachineBoxById = getMachineBoxById;
//add machine
const createMachineBox = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: machineBox_1.MachineBox,
            data: req.body,
            message: "Create machine successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createMachineBox = createMachineBox;
//update machine
const updateMachineBoxById = async (req, res, next) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: machineBox_1.MachineBox,
            itemId: Number(machineId),
            dataUpdated: machineUpdated,
            message: "update machine successfully",
            errMessage: "machine not found",
            errCode: "MACHINE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMachineBoxById = updateMachineBoxById;
//delete machine
const deleteMachineBoxById = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: machineBox_1.MachineBox,
            itemId: Number(machineId),
            message: `delete machineId: ${machineId} successfully`,
            errMessage: "machine not found",
            errCode: "MACHINE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMachineBoxById = deleteMachineBoxById;
//# sourceMappingURL=adminMachineController.js.map