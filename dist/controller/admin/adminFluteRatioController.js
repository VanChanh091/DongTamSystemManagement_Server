"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFluteRatio = exports.updateFluteRatio = exports.createFluteRatio = exports.getAllFluteRatio = void 0;
const adminService_1 = require("../../service/admin/adminService");
const fluteRatio_1 = require("../../models/admin/fluteRatio");
const getAllFluteRatio = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: fluteRatio_1.FluteRatio,
            message: "get all flute ratio successfully",
        });
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
            message: "Create flute ratio successfully",
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
            message: "update flute ratio successfully",
            errMessage: "flute ratio not found",
            errCode: "FLUTE_RATIO_NOT_FOUND",
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
            message: "delete flute ratio successfully",
            errMessage: "flute ratio not found",
            errCode: "FLUTE_RATIO_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFluteRatio = deleteFluteRatio;
//# sourceMappingURL=adminFluteRatioController.js.map