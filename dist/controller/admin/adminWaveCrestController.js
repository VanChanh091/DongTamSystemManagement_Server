"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWaveCrestById = exports.updateWaveCrestById = exports.createWaveCrestCoefficient = exports.getWaveCrestById = exports.getAllWaveCrestCoefficient = void 0;
const waveCrestCoefficient_1 = require("../../models/admin/waveCrestCoefficient");
//get all wave crest coefficient
const getAllWaveCrestCoefficient = async (req, res) => {
    try {
        const data = await waveCrestCoefficient_1.WaveCrestCoefficient.findAll();
        res.status(200).json({ message: "get all wave crest coefficient successfully", data });
    }
    catch (error) {
        console.error("failed to get all wave crest coefficient", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.getAllWaveCrestCoefficient = getAllWaveCrestCoefficient;
//get wave crest by id
//use to get id for update
const getWaveCrestById = async (req, res) => {
    const { waveCrestId } = req.query;
    const id = Number(waveCrestId);
    try {
        const waveCrest = await waveCrestCoefficient_1.WaveCrestCoefficient.findByPk(id);
        if (!waveCrest) {
            return res.status(404).json({ message: "wave crest not found" });
        }
        return res.status(200).json({
            message: `get wave crest by waveCrestId:${id}`,
            data: waveCrest,
        });
    }
    catch (error) {
        console.error(`failed to get wave crest by waveCrestId:${id}`, error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.getWaveCrestById = getWaveCrestById;
//add wave crest coefficient
const createWaveCrestCoefficient = async (req, res) => {
    const waveCrest = req.body;
    const transaction = await waveCrestCoefficient_1.WaveCrestCoefficient.sequelize?.transaction();
    try {
        const newWaveCrest = await waveCrestCoefficient_1.WaveCrestCoefficient.create(waveCrest, { transaction });
        await transaction?.commit();
        res.status(200).json({
            message: "create wave crest coefficient successfully",
            data: newWaveCrest,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("failed to create wave crest coefficient", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.createWaveCrestCoefficient = createWaveCrestCoefficient;
//update wave crest coefficient
const updateWaveCrestById = async (req, res) => {
    const { waveCrestId } = req.query;
    const { ...waveCrestUpdated } = req.body;
    const id = Number(waveCrestId);
    try {
        const existingWaveCrest = await waveCrestCoefficient_1.WaveCrestCoefficient.findByPk(id);
        if (!existingWaveCrest) {
            return res.status(404).json({ message: "wave crest coefficient not found" });
        }
        await existingWaveCrest.update({
            ...waveCrestUpdated,
        });
        res.status(200).json({
            message: "update wave crest coefficient successfully",
            data: existingWaveCrest,
        });
    }
    catch (error) {
        console.error("failed to update wave crest coefficient", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.updateWaveCrestById = updateWaveCrestById;
//delete wave crest coefficient
const deleteWaveCrestById = async (req, res) => {
    const { waveCrestId } = req.query;
    const id = Number(waveCrestId);
    try {
        const waveCrest = await waveCrestCoefficient_1.WaveCrestCoefficient.findByPk(id);
        if (!waveCrest) {
            return res.status(404).json({ message: "wave crest coefficient not found" });
        }
        await waveCrest.destroy();
        res.status(200).json({
            message: `delete waveCrestCoefficientId:${id} successfully`,
        });
    }
    catch (error) {
        console.error("failed to delete wave crest coefficient", error.message);
        res.status(500).json({ message: "server error" });
    }
};
exports.deleteWaveCrestById = deleteWaveCrestById;
//# sourceMappingURL=adminWaveCrestController.js.map