"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWaveCrest = exports.updateWaveCrest = exports.createWaveCrest = exports.getWaveCrestCoefficient = void 0;
const waveCrestCoefficient_1 = require("../../models/admin/waveCrestCoefficient");
const adminService_1 = require("../../service/admin/adminService");
const getWaveCrestCoefficient = async (req, res, next) => {
    const { waveCrestId } = req.query;
    try {
        let response;
        if (waveCrestId) {
            response = await adminService_1.adminService.getItemById({
                model: waveCrestCoefficient_1.WaveCrestCoefficient,
                itemId: Number(waveCrestId),
                errMessage: "wave crest not found",
                errCode: "WAVE_CREST_NOT_FOUND",
            });
        }
        else {
            response = await adminService_1.adminService.getAllItems({
                model: waveCrestCoefficient_1.WaveCrestCoefficient,
                message: "get all wave crest coefficient successfully",
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getWaveCrestCoefficient = getWaveCrestCoefficient;
//add wave crest coefficient
const createWaveCrest = async (req, res, next) => {
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
exports.createWaveCrest = createWaveCrest;
//update wave crest coefficient
const updateWaveCrest = async (req, res, next) => {
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
exports.updateWaveCrest = updateWaveCrest;
//delete wave crest coefficient
const deleteWaveCrest = async (req, res, next) => {
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
exports.deleteWaveCrest = deleteWaveCrest;
//# sourceMappingURL=adminWaveCrestController.js.map