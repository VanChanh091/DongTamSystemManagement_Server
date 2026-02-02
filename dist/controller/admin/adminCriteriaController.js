"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCriteria = exports.updateCriteria = exports.createNewCriteria = exports.getAllQcCriteria = void 0;
const adminCriteriaService_1 = require("../../service/admin/adminCriteriaService");
//get all qc criteria
const getAllQcCriteria = async (req, res, next) => {
    const { type } = req.query;
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.getAllQcCriteria(type);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQcCriteria = getAllQcCriteria;
//create new qc criteria
const createNewCriteria = async (req, res, next) => {
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.createNewCriteria(req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewCriteria = createNewCriteria;
//update qc criteria
const updateCriteria = async (req, res, next) => {
    const { qcCriteriaId } = req.query;
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.updateCriteria(Number(qcCriteriaId), req.body);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCriteria = updateCriteria;
//delete qc criteria
const deleteCriteria = async (req, res, next) => {
    const { qcCriteriaId } = req.query;
    try {
        const response = await adminCriteriaService_1.adminCriteriaService.deleteCriteria(Number(qcCriteriaId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCriteria = deleteCriteria;
//# sourceMappingURL=adminCriteriaController.js.map