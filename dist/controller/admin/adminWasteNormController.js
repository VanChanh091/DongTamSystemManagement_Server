"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWasteBoxById = exports.updateWasteBoxById = exports.createWasteBox = exports.getWasteBoxById = exports.getAllWasteBox = exports.deleteWasteNormById = exports.updateWasteNormById = exports.createWasteNorm = exports.getWasteNormById = exports.getAllWasteNorm = void 0;
const wasteNormPaper_1 = require("../../models/admin/wasteNormPaper");
const wasteNormBox_1 = require("../../models/admin/wasteNormBox");
//===============================WASTE PAPER=====================================
//get all
const getAllWasteNorm = async (req, res) => {
    try {
        const data = await wasteNormPaper_1.WasteNormPaper.findAll();
        res.status(200).json({ message: "get all machine successfully", data });
    }
    catch (error) {
        console.error("failed to get all waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.getAllWasteNorm = getAllWasteNorm;
//get waste norm by id
//use to get id for update
const getWasteNormById = async (req, res) => {
    const { wasteNormId } = req.query;
    const id = Number(wasteNormId);
    try {
        const wasteNorm = await wasteNormPaper_1.WasteNormPaper.findByPk(id);
        if (!wasteNorm) {
            return res.status(404).json({ message: "waste norm not found" });
        }
        return res.status(200).json({
            message: `get waste norm by wasteNormId:${id}`,
            data: wasteNorm,
        });
    }
    catch (error) {
        console.error(`failed to get  wasteNormId:${id}`, error);
        res.status(500).json({ message: "server error" });
    }
};
exports.getWasteNormById = getWasteNormById;
//add waste norm
const createWasteNorm = async (req, res) => {
    const wasteNorm = req.body;
    const transaction = await wasteNormPaper_1.WasteNormPaper.sequelize?.transaction();
    try {
        const newWasteNorm = await wasteNormPaper_1.WasteNormPaper.create(wasteNorm, { transaction });
        await transaction?.commit();
        res.status(200).json({ message: "create machine successfully", data: newWasteNorm });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("failed to create waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.createWasteNorm = createWasteNorm;
//update waste norm
const updateWasteNormById = async (req, res) => {
    const { wasteNormId } = req.query;
    const { ...wasteNormUpdated } = req.body;
    const id = Number(wasteNormId);
    try {
        const existingWasteNorm = await wasteNormPaper_1.WasteNormPaper.findByPk(id);
        if (!existingWasteNorm) {
            return res.status(404).json({ message: "waste norm not found" });
        }
        await existingWasteNorm.update({
            ...wasteNormUpdated,
        });
        res.status(200).json({
            message: "update waste norm successfully",
            data: existingWasteNorm,
        });
    }
    catch (error) {
        console.error("failed to update waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.updateWasteNormById = updateWasteNormById;
//delete waste norm
const deleteWasteNormById = async (req, res) => {
    const { wasteNormId } = req.query;
    const id = Number(wasteNormId);
    try {
        const wasteNorm = await wasteNormPaper_1.WasteNormPaper.findByPk(id);
        if (!wasteNorm) {
            return res.status(404).json({ message: "waste norm not found" });
        }
        await wasteNorm.destroy();
        res.status(200).json({ message: `delete wasteNormId:${id} successfully` });
    }
    catch (error) {
        console.error("failed to delete waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.deleteWasteNormById = deleteWasteNormById;
//===============================WASTE BOX=====================================
const getAllWasteBox = async (req, res) => {
    try {
        const data = await wasteNormBox_1.WasteNormBox.findAll();
        res.status(200).json({ message: "get all WasteNormBox successfully", data });
    }
    catch (error) {
        console.error("failed to get all waste norm box", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.getAllWasteBox = getAllWasteBox;
//get waste norm by id
//use to get id for update
const getWasteBoxById = async (req, res) => {
    const { wasteNormId } = req.query;
    const id = Number(wasteNormId);
    try {
        const wasteNorm = await wasteNormBox_1.WasteNormBox.findByPk(id);
        if (!wasteNorm) {
            return res.status(404).json({ message: "waste norm not found" });
        }
        return res.status(200).json({
            message: `get waste norm by wasteNormId:${id}`,
            data: wasteNorm,
        });
    }
    catch (error) {
        console.error(`failed to get waste norm by wasteNormId:${id}`, error);
        res.status(500).json({ message: "server error" });
    }
};
exports.getWasteBoxById = getWasteBoxById;
//add waste norm
const createWasteBox = async (req, res) => {
    const wasteNorm = req.body;
    const transaction = await wasteNormBox_1.WasteNormBox.sequelize?.transaction();
    try {
        const newWasteNorm = await wasteNormBox_1.WasteNormBox.create(wasteNorm, { transaction });
        await transaction?.commit();
        res.status(200).json({
            message: "create WasteNormBox successfully",
            data: newWasteNorm,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("failed to create waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.createWasteBox = createWasteBox;
//update waste norm
const updateWasteBoxById = async (req, res) => {
    const { wasteNormId } = req.query;
    const { ...wasteNormUpdated } = req.body;
    const id = Number(wasteNormId);
    try {
        const existingWasteNorm = await wasteNormBox_1.WasteNormBox.findByPk(id);
        if (!existingWasteNorm) {
            return res.status(404).json({ message: "waste norm not found" });
        }
        await existingWasteNorm.update({
            ...wasteNormUpdated,
        });
        res.status(200).json({
            message: "update waste norm successfully",
            data: existingWasteNorm,
        });
    }
    catch (error) {
        console.error("failed to update waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.updateWasteBoxById = updateWasteBoxById;
//delete waste norm
const deleteWasteBoxById = async (req, res) => {
    const { wasteNormId } = req.query;
    const id = Number(wasteNormId);
    try {
        const wasteNorm = await wasteNormBox_1.WasteNormBox.findByPk(id);
        if (!wasteNorm) {
            return res.status(404).json({ message: "waste norm not found" });
        }
        await wasteNorm.destroy();
        res.status(200).json({ message: `delete wasteNormId:${id} successfully` });
    }
    catch (error) {
        console.error("failed to delete waste norm", error);
        res.status(500).json({ message: "server error" });
    }
};
exports.deleteWasteBoxById = deleteWasteBoxById;
//# sourceMappingURL=adminWasteNormController.js.map