"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWasteBoxById = exports.updateWasteBoxById = exports.createWasteBox = exports.getWasteBoxById = exports.getAllWasteBox = exports.deleteWasteNormById = exports.updateWasteNormById = exports.createWasteNorm = exports.getWasteNormById = exports.getAllWasteNorm = void 0;
const wasteNormPaper_1 = require("../../models/admin/wasteNormPaper");
const wasteNormBox_1 = require("../../models/admin/wasteNormBox");
const adminService_1 = require("../../service/admin/adminService");
//===============================WASTE PAPER=====================================
//get all
const getAllWasteNorm = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: wasteNormPaper_1.WasteNormPaper,
            message: "get all waste successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllWasteNorm = getAllWasteNorm;
//get waste norm by id
//use to get id for update
const getWasteNormById = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.getItemById({
            model: wasteNormPaper_1.WasteNormPaper,
            itemId: Number(wasteNormId),
            errMessage: "waste norm not found",
            errCode: "WASTE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWasteNormById = getWasteNormById;
//add waste norm
const createWasteNorm = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: wasteNormPaper_1.WasteNormPaper,
            data: req.body,
            message: "create waste successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createWasteNorm = createWasteNorm;
//update waste norm
const updateWasteNormById = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: wasteNormPaper_1.WasteNormPaper,
            itemId: Number(wasteNormId),
            dataUpdated: req.body,
            message: "update waste norm successfully",
            errMessage: "waste norm not found",
            errCode: "WASTE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWasteNormById = updateWasteNormById;
//delete waste norm
const deleteWasteNormById = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: wasteNormPaper_1.WasteNormPaper,
            itemId: Number(wasteNormId),
            message: `delete wasteId: ${wasteNormId} successfully`,
            errMessage: "waste norm not found",
            errCode: "WASTE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteWasteNormById = deleteWasteNormById;
//===============================WASTE BOX=====================================
const getAllWasteBox = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: wasteNormBox_1.WasteNormBox,
            message: "get all waste successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllWasteBox = getAllWasteBox;
//get waste norm by id
//use to get id for update
const getWasteBoxById = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.getItemById({
            model: wasteNormBox_1.WasteNormBox,
            itemId: Number(wasteNormId),
            errMessage: "waste norm not found",
            errCode: "WASTE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWasteBoxById = getWasteBoxById;
//add waste norm
const createWasteBox = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: wasteNormBox_1.WasteNormBox,
            data: req.body,
            message: "create waste successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createWasteBox = createWasteBox;
//update waste norm
const updateWasteBoxById = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: wasteNormBox_1.WasteNormBox,
            itemId: Number(wasteNormId),
            dataUpdated: req.body,
            message: "update waste norm successfully",
            errMessage: "waste norm not found",
            errCode: "WASTE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWasteBoxById = updateWasteBoxById;
//delete waste norm
const deleteWasteBoxById = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: wasteNormBox_1.WasteNormBox,
            itemId: Number(wasteNormId),
            message: `delete wasteId: ${wasteNormId} successfully`,
            errMessage: "waste norm not found",
            errCode: "WASTE_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteWasteBoxById = deleteWasteBoxById;
//# sourceMappingURL=adminWasteNormController.js.map