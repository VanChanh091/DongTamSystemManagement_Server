"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWasteBox = exports.updateWasteBox = exports.createWasteBox = exports.getWasteBoxes = exports.deleteWastePaper = exports.updateWastePaper = exports.createWastePaper = exports.getWastePapers = void 0;
const wasteNormPaper_1 = require("../../models/admin/wasteNormPaper");
const wasteNormBox_1 = require("../../models/admin/wasteNormBox");
const adminService_1 = require("../../service/admin/adminService");
//===============================WASTE PAPER=====================================
const getWastePapers = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        let response;
        if (wasteNormId) {
            response = await adminService_1.adminService.getItemById({
                model: wasteNormPaper_1.WasteNormPaper,
                itemId: Number(wasteNormId),
                errMessage: "waste paper not found",
                errCode: "WASTE_PAPER_NOT_FOUND",
            });
        }
        else {
            response = await adminService_1.adminService.getAllItems({
                model: wasteNormPaper_1.WasteNormPaper,
                message: "get all waste papers successfully",
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWastePapers = getWastePapers;
//add waste norm paper
const createWastePaper = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: wasteNormPaper_1.WasteNormPaper,
            data: req.body,
            message: "create waste paper successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createWastePaper = createWastePaper;
//update waste norm
const updateWastePaper = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: wasteNormPaper_1.WasteNormPaper,
            itemId: Number(wasteNormId),
            dataUpdated: req.body,
            message: "update waste paper successfully",
            errMessage: "waste paper not found",
            errCode: "WASTE_PAPER_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWastePaper = updateWastePaper;
//delete waste norm
const deleteWastePaper = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: wasteNormPaper_1.WasteNormPaper,
            itemId: Number(wasteNormId),
            message: `delete wasteId: ${wasteNormId} successfully`,
            errMessage: "waste paper not found",
            errCode: "WASTE_PAPER_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteWastePaper = deleteWastePaper;
//===============================WASTE BOX=====================================
const getWasteBoxes = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        let response;
        if (wasteNormId) {
            response = await adminService_1.adminService.getItemById({
                model: wasteNormBox_1.WasteNormBox,
                itemId: Number(wasteNormId),
                errMessage: "waste norm not found",
                errCode: "WASTE_NOT_FOUND",
            });
        }
        else {
            response = await adminService_1.adminService.getAllItems({
                model: wasteNormBox_1.WasteNormBox,
                message: "get all waste successfully",
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWasteBoxes = getWasteBoxes;
//add waste box
const createWasteBox = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: wasteNormBox_1.WasteNormBox,
            data: req.body,
            message: "create waste box successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createWasteBox = createWasteBox;
//update waste box
const updateWasteBox = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: wasteNormBox_1.WasteNormBox,
            itemId: Number(wasteNormId),
            dataUpdated: req.body,
            message: "update waste box successfully",
            errMessage: "waste box not found",
            errCode: "WASTE_BOX_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWasteBox = updateWasteBox;
//delete waste box
const deleteWasteBox = async (req, res, next) => {
    const { wasteNormId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: wasteNormBox_1.WasteNormBox,
            itemId: Number(wasteNormId),
            message: `delete wasteId: ${wasteNormId} successfully`,
            errMessage: "waste box not found",
            errCode: "WASTE_BOX_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteWasteBox = deleteWasteBox;
//# sourceMappingURL=adminWasteNormController.js.map