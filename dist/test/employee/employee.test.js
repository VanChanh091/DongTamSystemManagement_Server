"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const employeeBasicInfo_1 = require("../../models/employee/employeeBasicInfo");
const employeeRepository_1 = require("../../repository/employeeRepository");
const employeeService_1 = require("../../service/employeeService");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const orderHelpers_1 = require("../../utils/helper/modelHelper/orderHelpers");
jest.mock("../../repository/employeeRepository");
jest.mock("../../configs/redisCache", () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
    },
}));
jest.mock("../../utils/helper/cacheManager");
jest.mock("../../utils/helper/excelExporter");
jest.mock("../../utils/helper/modelHelper/orderHelpers");
const commit = jest.fn();
const rollback = jest.fn();
employeeBasicInfo_1.EmployeeBasicInfo.sequelize = {
    transaction: jest.fn().mockResolvedValue({ commit, rollback }),
};
cacheManager_1.CacheManager.check = jest.fn();
cacheManager_1.CacheManager.clearEmployee = jest.fn();
// mock redis
redisCache_1.default.get = jest.fn();
redisCache_1.default.set = jest.fn();
describe("employeeService", () => {
    beforeEach(() => jest.clearAllMocks());
    // -------------------------------------------------------------------------
    // 1. getAllEmployees
    // -------------------------------------------------------------------------
    test("getAllEmployees - lấy từ cache", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: false });
        redisCache_1.default.get.mockResolvedValue(JSON.stringify({ data: ["A"] }));
        const result = await employeeService_1.employeeService.getAllEmployees({});
        expect(result.data[0]).toBe("A");
        expect(redisCache_1.default.get).toHaveBeenCalled();
    });
    test("getAllEmployees - cache đổi → lấy DB", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        employeeRepository_1.employeeRepository.employeeCount.mockResolvedValue(1);
        employeeRepository_1.employeeRepository.findEmployeeByPage.mockResolvedValue(["EMP001"]);
        const result = await employeeService_1.employeeService.getAllEmployees({});
        expect(result.data[0]).toBe("EMP001");
        expect(redisCache_1.default.set).toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 2. getEmployeesByField
    // -------------------------------------------------------------------------
    test("getEmployeesByField - valid field", async () => {
        orderHelpers_1.filterDataFromCache.mockResolvedValue({ data: ["X"] });
        const result = await employeeService_1.employeeService.getEmployeesByField({
            field: "fullName",
            keyword: "abc",
            page: 1,
            pageSize: 20,
        });
        expect(result.data[0]).toBe("X");
    });
    test("getEmployeesByField - invalid field", async () => {
        await expect(employeeService_1.employeeService.getEmployeesByField({
            field: "wrong",
            keyword: "x",
            page: 1,
            pageSize: 20,
        })).rejects.toThrow();
    });
    // -------------------------------------------------------------------------
    // 3. createEmployee
    // -------------------------------------------------------------------------
    test("createEmployee - lỗi → rollback", async () => {
        employeeRepository_1.employeeRepository.createEmployee.mockRejectedValue(new Error("DB error"));
        await expect(employeeService_1.employeeService.createEmployee({ fullName: "ERR" })).rejects.toThrow();
        expect(rollback).toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 4. updateEmployee
    // -------------------------------------------------------------------------
    test("updateEmployee - cập nhật thành công", async () => {
        employeeRepository_1.employeeRepository.findEmployeeByPk.mockResolvedValue({
            employeeId: 5,
            companyInfo: {},
        });
        employeeRepository_1.employeeRepository.updateEmployee.mockResolvedValue(true);
        employeeRepository_1.employeeRepository.findEmployeeById.mockResolvedValue({
            employeeId: 5,
            updated: true,
        });
        const result = await employeeService_1.employeeService.updateEmployee(5, {
            fullName: "New Name",
            companyInfo: { department: "IT" },
        });
        expect(result.data && result.data.employeeId).toBe(5);
        expect(commit).toHaveBeenCalled();
    });
    test("updateEmployee - không tìm thấy", async () => {
        employeeRepository_1.employeeRepository.findEmployeeByPk.mockResolvedValue(null);
        await expect(employeeService_1.employeeService.updateEmployee(999, {})).rejects.toThrow();
        expect(rollback).toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 5. deleteEmployee
    // -------------------------------------------------------------------------
    test("deleteEmployee - thành công", async () => {
        employeeRepository_1.employeeRepository.findEmployeeByPk.mockResolvedValue({
            destroy: jest.fn(),
        });
        const result = await employeeService_1.employeeService.deleteEmployee(7);
        expect(result.message).toBe("delete employee successfully");
        expect(commit).toHaveBeenCalled();
    });
    test("deleteEmployee - không tìm thấy", async () => {
        employeeRepository_1.employeeRepository.findEmployeeByPk.mockResolvedValue(null);
        await expect(employeeService_1.employeeService.deleteEmployee(100)).rejects.toThrow();
        expect(rollback).toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 6. exportExcelEmployee
    // -------------------------------------------------------------------------
    test("exportExcelEmployee - chạy excel export", async () => {
        employeeRepository_1.employeeRepository.findAllEmployee.mockResolvedValue([{ id: 1 }]);
        const res = {
            setHeader: jest.fn(),
            end: jest.fn(),
        };
        await employeeService_1.employeeService.exportExcelEmployee(res, { all: "true" });
        expect(excelExporter_1.exportExcelResponse).toHaveBeenCalled();
    });
});
//# sourceMappingURL=employee.test.js.map