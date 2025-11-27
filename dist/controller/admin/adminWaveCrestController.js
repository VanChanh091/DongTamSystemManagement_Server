"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWaveCrestById = exports.updateWaveCrestById = exports.createWaveCrestCoefficient = exports.getWaveCrestById = exports.getAllWaveCrestCoefficient = void 0;
const adminService_1 = require("../../service/adminService");
//get all wave crest coefficient
const getAllWaveCrestCoefficient = async (req, res) => {
    try {
        const response = await adminService_1.adminService.getAllWaveCrestCoefficient();
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllWaveCrestCoefficient = getAllWaveCrestCoefficient;
//get wave crest by id
//use to get id for update
const getWaveCrestById = async (req, res) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.getWaveCrestById(Number(waveCrestId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getWaveCrestById = getWaveCrestById;
//add wave crest coefficient
const createWaveCrestCoefficient = async (req, res) => {
    const waveCrest = req.body;
    try {
        const response = await adminService_1.adminService.createWaveCrestCoefficient(waveCrest);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.createWaveCrestCoefficient = createWaveCrestCoefficient;
//update wave crest coefficient
const updateWaveCrestById = async (req, res) => {
    const { waveCrestId } = req.query;
    const { ...waveCrestUpdated } = req.body;
    try {
        const response = await adminService_1.adminService.updateWaveCrestById(Number(waveCrestId), waveCrestUpdated);
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateWaveCrestById = updateWaveCrestById;
//delete wave crest coefficient
const deleteWaveCrestById = async (req, res) => {
    const { waveCrestId } = req.query;
    try {
        const response = await adminService_1.adminService.deleteWaveCrestById(Number(waveCrestId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteWaveCrestById = deleteWaveCrestById;
//# sourceMappingURL=adminWaveCrestController.js.map