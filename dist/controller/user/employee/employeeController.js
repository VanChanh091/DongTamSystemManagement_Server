"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelEmployee = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeesByField = exports.getAllEmployees = void 0;
const employeeService_1 = require("../../../service/employeeService");
//get all
const getAllEmployees = async (req, res) => {
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
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllEmployees = getAllEmployees;
//get by field
const getEmployeesByField = async (req, res) => {
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
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getEmployeesByField = getEmployeesByField;
//add employee
const createEmployee = async (req, res) => {
    try {
        const response = await employeeService_1.employeeService.createEmployee(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.createEmployee = createEmployee;
//update
const updateEmployee = async (req, res) => {
    const { employeeId } = req.query;
    try {
        const response = await employeeService_1.employeeService.updateEmployee(Number(employeeId), req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateEmployee = updateEmployee;
//delete
const deleteEmployee = async (req, res) => {
    const { employeeId } = req.query;
    try {
        const response = await employeeService_1.employeeService.deleteEmployee(Number(employeeId));
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteEmployee = deleteEmployee;
//export excel
const exportExcelEmployee = async (req, res) => {
    const { status, joinDate, all = false } = req.body;
    try {
        await employeeService_1.employeeService.exportExcelEmployee(res, { status, joinDate, all });
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.exportExcelEmployee = exportExcelEmployee;
//# sourceMappingURL=employeeController.js.map