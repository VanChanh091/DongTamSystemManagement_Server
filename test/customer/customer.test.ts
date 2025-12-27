import redisCache from "../../assest/configs/redisCache";
import { Customer } from "../../models/customer/customer";
import { customerRepository } from "../../repository/customerRepository";
import { customerService } from "../../service/customerService";
import { AppError } from "../../utils/appError";
import { CacheManager } from "../../utils/helper/cacheManager";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { generateNextId } from "../../utils/helper/generateNextId";

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

(Customer.sequelize as any) = {
  transaction: jest.fn().mockResolvedValue({
    commit,
    rollback,
  }),
};

// helper for mocking cache check
(CacheManager.check as jest.Mock) = jest.fn();
(CacheManager.clearCustomer as jest.Mock) = jest.fn();

// mock redis
(redisCache.get as jest.Mock) = jest.fn();
(redisCache.set as jest.Mock) = jest.fn();

// mock excel export
(exportExcelResponse as jest.Mock) = jest.fn();

describe("Customer Service", () => {
  afterEach(() => jest.clearAllMocks());

  // getAllCustomers
  it("should return cached data if cache exists", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: false });

    const fakeCache = JSON.stringify({
      data: [{ id: 1, name: "A" }],
    });

    (redisCache.get as jest.Mock).mockResolvedValue(fakeCache);

    const result = await customerService.getAllCustomers({
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].name).toBe("A");
    expect(redisCache.get).toHaveBeenCalled();
  });

  it("should query DB when cache invalid", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });

    (customerRepository.customerCount as jest.Mock).mockResolvedValue(1);
    (customerRepository.findCustomerByPage as jest.Mock).mockResolvedValue([
      { customerId: "CUS0001" },
    ]);

    const result = await customerService.getAllCustomers({
      page: 1,
      pageSize: 20,
    });

    expect(result.data.length).toBe(1);
    expect(redisCache.set).toHaveBeenCalled();
  });

  // getCustomerByFields
  it("should return filtered result", async () => {
    const fakeResult = {
      data: [{ customerId: "TEST01", customerName: "John" }],
    };

    // mock filterDataFromCache by overriding require
    const mockFilter = jest.spyOn(
      require("../../utils/helper/modelHelper/orderHelpers"),
      "filterDataFromCache"
    );

    mockFilter.mockResolvedValue(fakeResult);

    const result = await customerService.getCustomerByFields({
      field: "customerName",
      keyword: "John",
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].customerName).toBe("John");
  });

  it("should throw error for invalid field", async () => {
    await expect(
      customerService.getCustomerByFields({
        field: "unknown",
        keyword: "A",
        page: 1,
        pageSize: 20,
      })
    ).rejects.toThrow(AppError);
  });

  // createCustomer
  it("should create customer successfully", async () => {
    (customerRepository.findAllIds as jest.Mock).mockResolvedValue([{ customerId: "CUS0001" }]);

    (generateNextId as jest.Mock).mockReturnValue("CUS0002");

    (customerRepository.createCustomer as jest.Mock).mockResolvedValue({
      customerId: "CUS0002",
      name: "John",
    });

    const result = await customerService.createCustomer({
      prefix: "CUS",
      customerName: "John",
    });

    expect(result.data.customerId).toBe("CUS0002");
    expect(commit).toHaveBeenCalled();
  });

  it("should rollback on error", async () => {
    (customerRepository.findAllIds as jest.Mock).mockRejectedValue(new Error("DB ERROR"));

    await expect(customerService.createCustomer({ prefix: "CUS" })).rejects.toThrow(AppError);

    expect(rollback).toHaveBeenCalled();
  });

  // updateCustomer
  it("should update customer successfully", async () => {
    (customerRepository.findByCustomerId as jest.Mock).mockResolvedValue({
      customerId: "CUS0001",
    });

    (customerRepository.updateCustomer as jest.Mock).mockResolvedValue({
      customerId: "CUS0001",
      updated: true,
    });

    const result = await customerService.updateCustomer("CUS0001", {
      customerName: "New Name",
    });

    expect(result.data.updated).toBe(true);
    expect(commit).toHaveBeenCalled();
  });

  it("should throw not found", async () => {
    (customerRepository.findByCustomerId as jest.Mock).mockResolvedValue(null);

    await expect(customerService.updateCustomer("BAD_ID", {})).rejects.toThrow(AppError);
  });

  // deleteCustomer
  it("should delete customer successfully", async () => {
    (customerRepository.deleteCustomer as jest.Mock).mockResolvedValue(true);

    const result = await customerService.deleteCustomer("CUS0001");

    expect(result.message).toBe("Customer deleted successfully");
    expect(commit).toHaveBeenCalled();
  });

  it("should throw not found error", async () => {
    (customerRepository.deleteCustomer as jest.Mock).mockResolvedValue(null);

    await expect(customerService.deleteCustomer("INVALID")).rejects.toThrow(AppError);

    expect(rollback).toHaveBeenCalled();
  });

  // exportExcelCustomer
  it("should call exportExcelResponse", async () => {
    (customerRepository.findAllForExport as jest.Mock).mockResolvedValue([
      { customerId: "CUS0001" },
    ]);

    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    await customerService.exportExcelCustomer(res, {
      all: "true",
    });

    expect(exportExcelResponse).toHaveBeenCalled();
  });
});
