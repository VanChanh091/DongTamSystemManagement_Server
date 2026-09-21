"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaperClassification = exports.createPaperClassification = exports.getAllPaperClassifications = exports.updateSupplierPaperCode = exports.createSupplierPaperCode = exports.getAllSupplierPaperCodes = exports.updateBasisWeight = exports.createBasisWeight = exports.getAllBasisWeights = exports.updatePaperType = exports.createPaperType = exports.getAllPaperTypes = exports.handleUpdateSupplier = exports.createSupplier = exports.getAllSuppliers = void 0;
const suppliers_1 = require("../../models/admin/paperClassifications/suppliers");
const paperTypes_1 = require("../../models/admin/paperClassifications/paperTypes");
const paperBasisWeights_1 = require("../../models/admin/paperClassifications/paperBasisWeights");
const adminService_1 = require("../../service/admin/adminService");
const adminPaperCodeService_1 = require("../../service/admin/adminPaperCodeService");
// ============================= SUPPLIERS =================================
const getAllSuppliers = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: suppliers_1.Suppliers,
            options: { order: [["supplierName", "ASC"]] },
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllSuppliers = getAllSuppliers;
const createSupplier = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: suppliers_1.Suppliers,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createSupplier = createSupplier;
const handleUpdateSupplier = async (req, res, next) => {
    const { supplierId, action } = req.query;
    try {
        let response;
        switch (action) {
            case "TOGGLE_ACTIVE":
                response = await adminPaperCodeService_1.adminPaperCodeService.toggleActiveSupplier({
                    supplierId: Number(supplierId),
                });
                break;
            case "UPDATE_SUPPLIER":
                response = await adminPaperCodeService_1.adminPaperCodeService.updateSupplier({
                    supplierId: Number(supplierId),
                    data: req.body,
                });
                break;
            default:
                throw new Error(`Invalid action: ${action}`);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handleUpdateSupplier = handleUpdateSupplier;
// ========================== PAPER TYPES ================================
const getAllPaperTypes = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({ model: paperTypes_1.PaperTypes });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllPaperTypes = getAllPaperTypes;
const createPaperType = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: paperTypes_1.PaperTypes,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createPaperType = createPaperType;
const updatePaperType = async (req, res, next) => {
    const { paperTypeId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: paperTypes_1.PaperTypes,
            itemId: Number(paperTypeId),
            dataUpdated: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePaperType = updatePaperType;
// ====================== PAPER BASIS WEIGHTS ============================
const getAllBasisWeights = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getAllItems({
            model: paperBasisWeights_1.PaperBasisWeights,
            options: { order: [["basisWeight", "ASC"]] },
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBasisWeights = getAllBasisWeights;
const createBasisWeight = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.createNewItem({
            model: paperBasisWeights_1.PaperBasisWeights,
            data: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createBasisWeight = createBasisWeight;
const updateBasisWeight = async (req, res, next) => {
    const { basisWeightId } = req.query;
    try {
        const response = await adminService_1.adminService.updateItem({
            model: paperBasisWeights_1.PaperBasisWeights,
            itemId: Number(basisWeightId),
            dataUpdated: req.body,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBasisWeight = updateBasisWeight;
// ====================== SUPPLIER PAPER CODES ===========================
const getAllSupplierPaperCodes = async (req, res, next) => {
    try {
        const response = await adminPaperCodeService_1.adminPaperCodeService.getAllSupplierPaperCodes();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllSupplierPaperCodes = getAllSupplierPaperCodes;
const createSupplierPaperCode = async (req, res, next) => {
    try {
        const response = await adminPaperCodeService_1.adminPaperCodeService.createSupplierPaperCode(req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createSupplierPaperCode = createSupplierPaperCode;
const updateSupplierPaperCode = async (req, res, next) => {
    try {
        const response = await adminPaperCodeService_1.adminPaperCodeService.updateSupplierPaperCode(req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSupplierPaperCode = updateSupplierPaperCode;
// ====================== PAPER CLASSIFICATIONS ==========================
const getAllPaperClassifications = async (req, res, next) => {
    const { page, pageSize } = req.query;
    try {
        const response = await adminPaperCodeService_1.adminPaperCodeService.getAllPaperClassifications({
            page: Number(page),
            pageSize: Number(pageSize),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllPaperClassifications = getAllPaperClassifications;
const createPaperClassification = async (req, res, next) => {
    try {
        const response = await adminPaperCodeService_1.adminPaperCodeService.createPaperClassification(req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createPaperClassification = createPaperClassification;
const updatePaperClassification = async (req, res, next) => {
    try {
        const response = await adminPaperCodeService_1.adminPaperCodeService.updatePaperClassification(req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePaperClassification = updatePaperClassification;
//# sourceMappingURL=adminPaperCodeController.js.map