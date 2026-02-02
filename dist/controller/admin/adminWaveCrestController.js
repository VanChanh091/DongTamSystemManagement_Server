"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWaveCrestById = exports.updateWaveCrestById = exports.createWaveCrestCoefficient = exports.getWaveCrestById = exports.getAllWaveCrestCoefficient = void 0;
const waveCrestCoefficient_1 = require("../../models/admin/waveCrestCoefficient");
const adminService_1 = require("../../service/admin/adminService");
//get all wave crest coefficient
const getAllWaveCrestCoefficient = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            message: "get all wave crest coefficient successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllWaveCrestCoefficient = getAllWaveCrestCoefficient;
//get wave crest by id
//use to get id for update
const getWaveCrestById = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.getItemById({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            itemId: Number(waveCrestId),
            errMessage: "wave crest not found",
            errCode: "WAVE_CREST_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWaveCrestById = getWaveCrestById;
//add wave crest coefficient
const createWaveCrestCoefficient = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            data: req.body,
            message: "create wave crest coefficient successfully",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createWaveCrestCoefficient = createWaveCrestCoefficient;
//update wave crest coefficient
const updateWaveCrestById = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            itemId: Number(waveCrestId),
            dataUpdated: req.body,
            message: "update wave crest coefficient successfully",
            errMessage: "wave crest coefficient not found",
            errCode: "WAVE_CREST_COEFF_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWaveCrestById = updateWaveCrestById;
//delete wave crest coefficient
const deleteWaveCrestById = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteItem({
            model: waveCrestCoefficient_1.WaveCrestCoefficient,
            itemId: Number(waveCrestId),
            message: `delete waveCrestCoefficientId: ${waveCrestId} successfully`,
            errMessage: "wave crest coefficient not found",
            errCode: "WAVE_CREST_COEFF_NOT_FOUND",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteWaveCrestById = deleteWaveCrestById;
//# sourceMappingURL=adminWaveCrestController.js.map