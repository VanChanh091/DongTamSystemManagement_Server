"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMachineBox = exports.updateMachineBox = exports.createMachineBox = exports.getMachineBoxes = exports.deleteMachinePaper = exports.updateMachinePaper = exports.createMachinePaper = exports.getRawMachinePapers = exports.getMachinePapers = void 0;
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
const getRawMachinePapers = async (req, res, next) => {
    try {
        const response = await machinePaper_1.MachinePaper.findAll({
            attributes: ["machineId", "machineName"],
            raw: true,
        });
        // Lọc trùng tên máy (chỉ giữ 1 bản ghi duy nhất cho mỗi machineName)
        const uniqueMap = new Map();
        for (const item of response) {
            if (item.machineName && !uniqueMap.has(item.machineName)) {
                uniqueMap.set(item.machineName, item);
            }
        }
        const uniqueList = Array.from(uniqueMap.values());
        // Định nghĩa hàm xác định độ ưu tiên sắp xếp
        const getPriority = (name) => {
            const lower = (name ?? "").toLowerCase();
            // Nhóm máy có số lớn (1350, 1800, 1900...) -> ưu tiên hàng đầu, xếp theo giá trị số
            const matchNumber = lower.match(/\d{3,4}/);
            if (matchNumber) {
                return { group: 1, val: parseInt(matchNumber[0], 10) };
            }
            // Nhóm "máy 2 lớp"
            if (lower.includes("2 lớp")) {
                return { group: 2, val: 0 };
            }
            // Nhóm "máy quấn cuồn"
            if (lower.includes("quấn cuồn")) {
                return { group: 3, val: 0 };
            }
            // Các trường hợp khác (nếu có phát sinh)
            return { group: 4, val: 0 };
        };
        // Tiến hành sắp xếp danh sách
        const sortedList = uniqueList.sort((a, b) => {
            const pA = getPriority(a.machineName);
            const pB = getPriority(b.machineName);
            if (pA.group !== pB.group) {
                return pA.group - pB.group;
            }
            if (pA.group === 1) {
                return pA.val - pB.val; // Xếp từ bé đến lớn: 1350 -> 1800 -> 1900
            }
            return (a.machineName ?? "").localeCompare(b.machineName ?? "", "vi");
        });
        return res.status(200).json({ message: "get raw machine successfully", data: sortedList });
    }
    catch (error) {
        next(error);
    }
};
exports.getRawMachinePapers = getRawMachinePapers;
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