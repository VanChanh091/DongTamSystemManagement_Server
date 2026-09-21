"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMachineBox = exports.updateMachineBox = exports.createMachineBox = exports.getMachineBoxes = exports.deleteMachinePaper = exports.updateMachinePaper = exports.createMachinePaper = exports.getMachinePapers = void 0;
const machinePaper_1 = require("../../models/admin/machinePaper");
const machineBox_1 = require("../../models/admin/machineBox");
const adminService_1 = require("../../service/admin/adminService");
//===============================PAPER=====================================
const getMachinePapers = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        let response;
        if (machineId) {
            response = await adminService_1.adminService.getItemById({
                model: machinePaper_1.MachinePaper,
                itemId: Number(machineId),
            });
        }
        else {
            response = await adminService_1.adminService.getAllItems({ model: machinePaper_1.MachinePaper });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMachinePapers = getMachinePapers;
//add machine
const createMachinePaper = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: machinePaper_1.MachinePaper,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createMachinePaper = createMachinePaper;
//update machine
const updateMachinePaper = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: machinePaper_1.MachinePaper,
            itemId: Number(machineId),
            dataUpdated: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMachinePaper = updateMachinePaper;
//delete machine
const deleteMachinePaper = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: machinePaper_1.MachinePaper,
            itemId: Number(machineId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMachinePaper = deleteMachinePaper;
//===============================BOX=====================================
const getMachineBoxes = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        let response;
        if (machineId) {
            response = await adminService_1.adminService.getItemById({ model: machineBox_1.MachineBox, itemId: Number(machineId) });
        }
        else {
            response = await adminService_1.adminService.getAllItems({ model: machineBox_1.MachineBox });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMachineBoxes = getMachineBoxes;
//add machine
const createMachineBox = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: machineBox_1.MachineBox,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createMachineBox = createMachineBox;
//update machine
const updateMachineBox = async (req, res, next) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: machineBox_1.MachineBox,
            itemId: Number(machineId),
            dataUpdated: machineUpdated,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMachineBox = updateMachineBox;
//delete machine
const deleteMachineBox = async (req, res, next) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: machineBox_1.MachineBox,
            itemId: Number(machineId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMachineBox = deleteMachineBox;
//# sourceMappingURL=adminMachineController.js.map