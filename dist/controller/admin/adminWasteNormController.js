"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWasteBoxById = exports.updateWasteBoxById = exports.createWasteBox = exports.getWasteBoxById = exports.getAllWasteBox = exports.deleteWasteNormById = exports.updateWasteNormById = exports.createWasteNorm = exports.getWasteNormById = exports.getAllWasteNorm = void 0;
const wasteNormPaper_1 = require("../../models/admin/wasteNormPaper");
const wasteNormBox_1 = require("../../models/admin/wasteNormBox");
const adminService_1 = require("../../service/adminService");
//===============================WASTE PAPER=====================================
//get all
const getAllWasteNorm = async (req, res) => {
    try {
        const response = await adminService_1.adminService.getAllWaste(wasteNormPaper_1.WasteNormPaper);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllWasteNorm = getAllWasteNorm;
//get waste norm by id
//use to get id for update
const getWasteNormById = async (req, res) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.getWasteById(wasteNormPaper_1.WasteNormPaper, Number(wasteNormId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getWasteNormById = getWasteNormById;
//add waste norm
const createWasteNorm = async (req, res) => {
    const wasteNorm = req.body;
    try {
        const response = await adminService_1.adminService.createWaste(wasteNormPaper_1.WasteNormPaper, wasteNorm);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.createWasteNorm = createWasteNorm;
//update waste norm
const updateWasteNormById = async (req, res) => {
    const { wasteNormId } = req.query;
    const { ...wasteNormUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateWaste(wasteNormPaper_1.WasteNormPaper, Number(wasteNormId), wasteNormUpdated);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateWasteNormById = updateWasteNormById;
//delete waste norm
const deleteWasteNormById = async (req, res) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteWaste(wasteNormPaper_1.WasteNormPaper, Number(wasteNormId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteWasteNormById = deleteWasteNormById;
//===============================WASTE BOX=====================================
const getAllWasteBox = async (req, res) => {
    try {
        const response = await adminService_1.adminService.getAllWaste(wasteNormBox_1.WasteNormBox);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllWasteBox = getAllWasteBox;
//get waste norm by id
//use to get id for update
const getWasteBoxById = async (req, res) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.getWasteById(wasteNormBox_1.WasteNormBox, Number(wasteNormId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getWasteBoxById = getWasteBoxById;
//add waste norm
const createWasteBox = async (req, res) => {
    const wasteNorm = req.body;
    try {
        const response = await adminService_1.adminService.createWaste(wasteNormBox_1.WasteNormBox, wasteNorm);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.createWasteBox = createWasteBox;
//update waste norm
const updateWasteBoxById = async (req, res) => {
    const { wasteNormId } = req.query;
    const { ...wasteNormUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateWaste(wasteNormBox_1.WasteNormBox, Number(wasteNormId), wasteNormUpdated);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateWasteBoxById = updateWasteBoxById;
//delete waste norm
const deleteWasteBoxById = async (req, res) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteWaste(wasteNormBox_1.WasteNormBox, Number(wasteNormId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteWasteBoxById = deleteWasteBoxById;
//# sourceMappingURL=adminWasteNormController.js.map