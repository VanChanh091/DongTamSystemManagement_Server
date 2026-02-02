import redisCache from "../../assest/configs/redisCache";
import { EmployeeBasicInfo } from "../../models/employee/employeeBasicInfo";
import { employeeRepository } from "../../repository/employeeRepository";
import { employeeService } from "../../service/employeeService";
import { CacheManager } from "../../utils/helper/cacheManager";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { filterDataFromCache } from "../../utils/helper/modelHelper/orderHelpers";

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

(EmployeeBasicInfo.sequelize as any) = {
  transaction: jest.fn().mockResolvedValue({ commit, rollback }),
} as any;

(CacheManager.check as jest.Mock) = jest.fn();
(CacheManager.clearEmployee as jest.Mock) = jest.fn();

// mock redis
(redisCache.get as jest.Mock) = jest.fn();
(redisCache.set as jest.Mock) = jest.fn();

describe("employeeService", () => {
  beforeEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // 1. getAllEmployees
  // -------------------------------------------------------------------------
  test("getAllEmployees - lấy từ cache", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: false });
    redisCache.get.mockResolvedValue(JSON.stringify({ data: ["A"] }));

    const result = await employeeService.getAllEmployees({});
    expect(result.data[0]).toBe("A");
    expect(redisCache.get).toHaveBeenCalled();
  });

  test("getAllEmployees - cache đổi → lấy DB", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });

    (employeeRepository.employeeCount as jest.Mock).mockResolvedValue(1);
    (employeeRepository.findEmployeeByPage as jest.Mock).mockResolvedValue(["EMP001"]);

    const result = await employeeService.getAllEmployees({});
    expect(result.data[0]).toBe("EMP001");
    expect(redisCache.set).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. getEmployeesByField
  // -------------------------------------------------------------------------
  test("getEmployeesByField - valid field", async () => {
    (filterDataFromCache as jest.Mock).mockResolvedValue({ data: ["X"] });

    const result = await employeeService.getEmployeesByField({
      field: "fullName",
      keyword: "abc",
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0]).toBe("X");
  });

  test("getEmployeesByField - invalid field", async () => {
    await expect(
      employeeService.getEmployeesByField({
        field: "wrong",
        keyword: "x",
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toThrow();
  });

  // -------------------------------------------------------------------------
  // 3. createEmployee
  // -------------------------------------------------------------------------

  test("createEmployee - lỗi → rollback", async () => {
    (employeeRepository.createEmployee as jest.Mock).mockRejectedValue(new Error("DB error"));

    await expect(employeeService.createEmployee({ fullName: "ERR" })).rejects.toThrow();

    expect(rollback).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. updateEmployee
  // -------------------------------------------------------------------------
  test("updateEmployee - cập nhật thành công", async () => {
    (employeeRepository.findEmployeeByPk as jest.Mock).mockResolvedValue({
      employeeId: 5,
      companyInfo: {},
    });

    (employeeRepository.updateEmployee as jest.Mock).mockResolvedValue(true);
    (employeeRepository.findEmployeeById as jest.Mock).mockResolvedValue({
      employeeId: 5,
      updated: true,
    });

    const result = await employeeService.updateEmployee(5, {
      fullName: "New Name",
      companyInfo: { department: "IT" },
    });

    expect(result.data && result.data.employeeId).toBe(5);
    expect(commit).toHaveBeenCalled();
  });

  test("updateEmployee - không tìm thấy", async () => {
    (employeeRepository.findEmployeeByPk as jest.Mock).mockResolvedValue(null);

    await expect(employeeService.updateEmployee(999, {})).rejects.toThrow();

    expect(rollback).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. deleteEmployee
  // -------------------------------------------------------------------------
  test("deleteEmployee - thành công", async () => {
    (employeeRepository.findEmployeeByPk as jest.Mock).mockResolvedValue({
      destroy: jest.fn(),
    });

    const result = await employeeService.deleteEmployee(7);

    expect(result.message).toBe("delete employee successfully");
    expect(commit).toHaveBeenCalled();
  });

  test("deleteEmployee - không tìm thấy", async () => {
    (employeeRepository.findEmployeeByPk as jest.Mock).mockResolvedValue(null);

    await expect(employeeService.deleteEmployee(100)).rejects.toThrow();
    expect(rollback).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. exportExcelEmployee
  // -------------------------------------------------------------------------
  test("exportExcelEmployee - chạy excel export", async () => {
    (employeeRepository.findAllEmployee as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    await employeeService.exportExcelEmployee(res, { all: "true" });
    expect(exportExcelResponse).toHaveBeenCalled();
  });
});
