"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMachineBoxById = exports.updateMachineBoxById = exports.createMachineBox = exports.getMachineBoxById = exports.getAllMachineBox = exports.deleteMachinePaperById = exports.updateMachinePaperById = exports.createMachinePaper = exports.getMachinePaperById = exports.getAllMachinePaper = void 0;
const machinePaper_1 = require("../../models/admin/machinePaper");
const machineBox_1 = require("../../models/admin/machineBox");
//===============================PAPER=====================================
//get all machine
const getAllMachinePaper = async (req, res) => {
    try {
        const data = await machinePaper_1.MachinePaper.findAll();
        res.status(200).json({ message: "get all machine successfully", data });
    }
    catch (error) {
        console.error("failed to get all machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.getAllMachinePaper = getAllMachinePaper;
//get machine by id
//use to get id for update
const getMachinePaperById = async (req, res) => {
    const { machineId } = req.query;
    const id = Number(machineId);
    try {
        const machine = await machinePaper_1.MachinePaper.findOne({
            where: { machineId: id },
        });
        if (!machine) {
            return res.status(404).json({ message: "machine not found" });
        }
        return res.status(200).json({ message: `get machine by id:${id}`, data: machine });
    }
    catch (error) {
        console.error(`failed to get machine by id:${id}`, error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.getMachinePaperById = getMachinePaperById;
//add machine
const createMachinePaper = async (req, res) => {
    const machine = req.body;
    const transaction = await machinePaper_1.MachinePaper.sequelize?.transaction();
    try {
        const newMachine = await machinePaper_1.MachinePaper.create(machine, { transaction });
        await transaction?.commit();
        res.status(200).json({
            message: "Create machine successfully",
            data: newMachine,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("❌ Failed to create machine:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createMachinePaper = createMachinePaper;
//update machine
const updateMachinePaperById = async (req, res) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    const id = Number(machineId);
    try {
        const existingMachine = await machinePaper_1.MachinePaper.findByPk(id);
        if (!existingMachine) {
            return res.status(404).json({ message: "machine not found" });
        }
        await existingMachine.update({
            ...machineUpdated,
        });
        res.status(200).json({ message: "update machine successfully", data: existingMachine });
    }
    catch (error) {
        console.error("failed to update machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.updateMachinePaperById = updateMachinePaperById;
//delete machine
const deleteMachinePaperById = async (req, res) => {
    const { machineId } = req.query;
    const id = Number(machineId);
    try {
        const machine = await machinePaper_1.MachinePaper.findByPk(id);
        if (!machine) {
            return res.status(404).json({ message: "machine not found" });
        }
        await machine.destroy();
        res.status(200).json({ message: `delete machineId:${id} successfully` });
    }
    catch (error) {
        console.error("failed to delete machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.deleteMachinePaperById = deleteMachinePaperById;
//===============================BOX=====================================
//get all machine
const getAllMachineBox = async (req, res) => {
    try {
        const data = await machineBox_1.MachineBox.findAll();
        res.status(200).json({ message: "get all machine successfully", data });
    }
    catch (error) {
        console.error("failed to get all machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.getAllMachineBox = getAllMachineBox;
//get machine by id
//use to get id for update
const getMachineBoxById = async (req, res) => {
    const { machineId } = req.query;
    const id = Number(machineId);
    try {
        const machine = await machineBox_1.MachineBox.findOne({
            where: { machineId: id },
        });
        if (!machine) {
            return res.status(404).json({ message: "machine not found" });
        }
        return res.status(200).json({ message: `get machine by id:${id}`, data: machine });
    }
    catch (error) {
        console.error(`failed to get machine by id:${id}`, error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.getMachineBoxById = getMachineBoxById;
//add machine
const createMachineBox = async (req, res) => {
    const machine = req.body;
    const transaction = await machineBox_1.MachineBox.sequelize?.transaction();
    try {
        const newMachine = await machineBox_1.MachineBox.create(machine, { transaction });
        await transaction?.commit();
        res.status(200).json({ message: "create machine successfully", data: newMachine });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("failed to create machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.createMachineBox = createMachineBox;
//update machine
const updateMachineBoxById = async (req, res) => {
    const { machineId } = req.query;
    const { ...machineUpdated } = req.body;
    const id = Number(machineId);
    try {
        const existingMachine = await machineBox_1.MachineBox.findByPk(id);
        if (!existingMachine) {
            return res.status(404).json({ message: "machine not found" });
        }
        await existingMachine.update({
            ...machineUpdated,
        });
        res.status(200).json({ message: "update machine successfully", data: existingMachine });
    }
    catch (error) {
        console.error("failed to update machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.updateMachineBoxById = updateMachineBoxById;
//delete machine
const deleteMachineBoxById = async (req, res) => {
    const { machineId } = req.query;
    const id = Number(machineId);
    try {
        const machine = await machineBox_1.MachineBox.findByPk(id);
        if (!machine) {
            return res.status(404).json({ message: "machine not found" });
        }
        await machine.destroy();
        res.status(200).json({ message: `delete machineId:${id} successfully` });
    }
    catch (error) {
        console.error("failed to delete machine", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.deleteMachineBoxById = deleteMachineBoxById;
//# sourceMappingURL=adminMachineController.js.map