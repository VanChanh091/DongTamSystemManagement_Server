"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMachineBoxById = exports.updateMachineBoxById = exports.createMachineBox = exports.getMachineBoxById = exports.getAllMachineBox = exports.deleteMachinePaperById = exports.updateMachinePaperById = exports.createMachinePaper = exports.getMachinePaperById = exports.getAllMachinePaper = void 0;
const machinePaper_1 = require("../../models/admin/machinePaper");
const machineBox_1 = require("../../models/admin/machineBox");
const adminService_1 = require("../../service/adminService");
//===============================PAPER=====================================
//get all machine
const getAllMachinePaper = async (req, res) => {
    try {
        const response = await adminService_1.adminService.getAllMachine(machinePaper_1.MachinePaper);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllMachinePaper = getAllMachinePaper;
//get machine by id
//use to get id for update
const getMachinePaperById = async (req, res) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.getMachineById(machinePaper_1.MachinePaper, Number(machineId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getMachinePaperById = getMachinePaperById;
//add machine
const createMachinePaper = async (req, res) => {
    try {
        const response = await adminService_1.adminService.createMachine(machinePaper_1.MachinePaper, req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.createMachinePaper = createMachinePaper;
//update machine
const updateMachinePaperById = async (req, res) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateMachineById(machinePaper_1.MachinePaper, Number(machineId), machineUpdated);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateMachinePaperById = updateMachinePaperById;
//delete machine
const deleteMachinePaperById = async (req, res) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteMachineById(machinePaper_1.MachinePaper, Number(machineId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteMachinePaperById = deleteMachinePaperById;
//===============================BOX=====================================
//get all machine
const getAllMachineBox = async (req, res) => {
    try {
        const response = await adminService_1.adminService.getAllMachine(machineBox_1.MachineBox);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllMachineBox = getAllMachineBox;
//get machine by id
//use to get id for update
const getMachineBoxById = async (req, res) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.getMachineById(machineBox_1.MachineBox, Number(machineId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getMachineBoxById = getMachineBoxById;
//add machine
const createMachineBox = async (req, res) => {
    try {
        const response = await adminService_1.adminService.createMachine(machineBox_1.MachineBox, req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.createMachineBox = createMachineBox;
//update machine
const updateMachineBoxById = async (req, res) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateMachineById(machineBox_1.MachineBox, Number(machineId), machineUpdated);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateMachineBoxById = updateMachineBoxById;
//delete machine
const deleteMachineBoxById = async (req, res) => {
    const { machineId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteMachineById(machineBox_1.MachineBox, Number(machineId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteMachineBoxById = deleteMachineBoxById;
//# sourceMappingURL=adminMachineController.js.map