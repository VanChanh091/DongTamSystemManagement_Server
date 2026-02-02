"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelEmployee = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeByPosition = exports.getEmployeesByField = exports.getAllEmployees = void 0;
const employeeService_1 = require("../../../service/employeeService");
//get all
const getAllEmployees = async (req, res, next) => {
    const { page = 1, pageSize = 20, noPaging = false, } = req.query;
    try {
        const response = await employeeService_1.employeeService.getAllEmployees({
            page: Number(page),
            pageSize: Number(pageSize),
            noPaging,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllEmployees = getAllEmployees;
//get by field
const getEmployeesByField = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await employeeService_1.employeeService.getEmployeesByField({
            field,
            keyword,
            page: Number(page),
            pageSize: Number(pageSize),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployeesByField = getEmployeesByField;
//get by field
const getEmployeeByPosition = async (req, res, next) => {
    try {
        const response = await employeeService_1.employeeService.getEmployeeByPosition();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployeeByPosition = getEmployeeByPosition;
//add employee
const createEmployee = async (req, res, next) => {
    try {
        const response = await employeeService_1.employeeService.createEmployee(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createEmployee = createEmployee;
//update
const updateEmployee = async (req, res, next) => {
    const { employeeId } = req.query;
    try {
        const response = await employeeService_1.employeeService.updateEmployee(Number(employeeId), req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateEmployee = updateEmployee;
//delete
const deleteEmployee = async (req, res, next) => {
    const { employeeId } = req.query;
    try {
        const response = await employeeService_1.employeeService.deleteEmployee(Number(employeeId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteEmployee = deleteEmployee;
//export excel
const exportExcelEmployee = async (req, res, next) => {
    const { status, joinDate, all = false } = req.body;
    try {
        await employeeService_1.employeeService.exportExcelEmployee(res, { status, joinDate, all });
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelEmployee = exportExcelEmployee;
//# sourceMappingURL=employeeController.js.map