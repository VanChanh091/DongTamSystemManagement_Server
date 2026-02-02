"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const customer_1 = require("../../models/customer/customer");
const customerRepository_1 = require("../../repository/customerRepository");
const customerService_1 = require("../../service/customerService");
const appError_1 = require("../../utils/appError");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const excelExporter_1 = require("../../utils/helper/excelExporter");
jest.mock("../../repository/customerRepository");
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
jest.mock("../../utils/helper/generateNextId");
// Mock transaction
const commit = jest.fn();
const rollback = jest.fn();
customer_1.Customer.sequelize = {
    transaction: jest.fn().mockResolvedValue({
        commit,
        rollback,
    }),
};
// helper for mocking cache check
cacheManager_1.CacheManager.check = jest.fn();
cacheManager_1.CacheManager.clearCustomer = jest.fn();
// mock redis
redisCache_1.default.get = jest.fn();
redisCache_1.default.set = jest.fn();
// mock excel export
excelExporter_1.exportExcelResponse = jest.fn();
describe("Customer Service", () => {
    afterEach(() => jest.clearAllMocks());
    // getAllCustomers
    it("should return cached data if cache exists", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: false });
        const fakeCache = JSON.stringify({
            data: [{ id: 1, name: "A" }],
        });
        redisCache_1.default.get.mockResolvedValue(fakeCache);
        const result = await customerService_1.customerService.getAllCustomers({
            page: 1,
            pageSize: 20,
        });
        expect(result.data[0].name).toBe("A");
        expect(redisCache_1.default.get).toHaveBeenCalled();
    });
    it("should query DB when cache invalid", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        customerRepository_1.customerRepository.customerCount.mockResolvedValue(1);
        customerRepository_1.customerRepository.findCustomerByPage.mockResolvedValue([
            { customerId: "CUS0001" },
        ]);
        const result = await customerService_1.customerService.getAllCustomers({
            page: 1,
            pageSize: 20,
        });
        expect(result.data.length).toBe(1);
        expect(redisCache_1.default.set).toHaveBeenCalled();
    });
    // getCustomerByFields
    it("should return filtered result", async () => {
        const fakeResult = {
            data: [{ customerId: "TEST01", customerName: "John" }],
        };
        // mock filterDataFromCache by overriding require
        const mockFilter = jest.spyOn(require("../../utils/helper/modelHelper/orderHelpers"), "filterDataFromCache");
        mockFilter.mockResolvedValue(fakeResult);
        const result = await customerService_1.customerService.getCustomerByFields({
            field: "customerName",
            keyword: "John",
            page: 1,
            pageSize: 20,
        });
        expect(result.data[0].customerName).toBe("John");
    });
    it("should throw error for invalid field", async () => {
        await expect(customerService_1.customerService.getCustomerByFields({
            field: "unknown",
            keyword: "A",
            page: 1,
            pageSize: 20,
        })).rejects.toThrow(appError_1.AppError);
    });
    // updateCustomer
    it("should update customer successfully", async () => {
        customerRepository_1.customerRepository.findByCustomerId.mockResolvedValue({
            customerId: "CUS0001",
        });
        customerRepository_1.customerRepository.updateCustomer.mockResolvedValue({
            customerId: "CUS0001",
            updated: true,
        });
        const result = await customerService_1.customerService.updateCustomer("CUS0001", {
            customerName: "New Name",
        });
        expect(result.data.updated).toBe(true);
        expect(commit).toHaveBeenCalled();
    });
    it("should throw not found", async () => {
        customerRepository_1.customerRepository.findByCustomerId.mockResolvedValue(null);
        await expect(customerService_1.customerService.updateCustomer("BAD_ID", {})).rejects.toThrow(appError_1.AppError);
    });
    // exportExcelCustomer
    it("should call exportExcelResponse", async () => {
        customerRepository_1.customerRepository.findAllForExport.mockResolvedValue([
            { customerId: "CUS0001" },
        ]);
        const res = {
            setHeader: jest.fn(),
            end: jest.fn(),
        };
        await customerService_1.customerService.exportExcelCustomer(res, {
            all: "true",
        });
        expect(excelExporter_1.exportExcelResponse).toHaveBeenCalled();
    });
});
//# sourceMappingURL=customer.test.js.map