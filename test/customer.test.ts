import { describe, beforeEach, test, expect, jest, afterAll } from "@jest/globals";
import { Customer } from "../models/customer/customer";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { customerRepository } from "../repository/customerRepository";
import { meiliService } from "../service/meiliService";
import { customerService } from "../service/customerService";
import { Transaction } from "sequelize";
import { sequelize } from "../assets/configs/connect/database.connect";

jest.mock("../assets/configs/connect/database.connect", () => ({
  sequelize: {
    transaction: jest.fn(),
    authenticate: jest.fn().mockImplementation(() => Promise.resolve()),
    close: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));

jest.mock("../models/customer/customer"); //models
jest.mock("../utils/helper/transactionHelper"); //transaction
jest.mock("../repository/customerRepository"); //repository
jest.mock("../service/meiliService"); //meilisearch
jest.mock("../utils/helper/modelHelper/orderHelpers"); //model helper

//mock transaction
const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
} as unknown as Transaction;

const getTestData = (overrides = {}) => ({
  prefix: "TEST",
  mst: "TEST123456",
  payment: {
    cusPaymentId: 1,
    timePayment: new Date(),
    paymentType: "daily",
    closingDate: 15,
  },
  ...overrides,
});

describe("customer service", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (runInTransaction as jest.Mock).mockImplementation(async (fn: any) => {
      return await fn(mockTransaction);
    });
  });

  //------------------------- CREATE -------------------------
  // Case 1: Tạo khách hàng thành công
  test("nên tạo khách hàng thành công khi dữ liệu hợp lệ", async () => {
    const inputData = getTestData();

    // Setup giả lập
    const mockedRepo = jest.mocked(customerRepository);

    //Check trùng (trả về mảng rỗng = không trùng)
    mockedRepo.findByIdOrMst.mockResolvedValue([]);

    // Lấy Sequence lớn nhất
    jest.mocked(Customer.max).mockResolvedValue(5);

    // Tạo khách hàng thành công
    mockedRepo.createCustomer.mockResolvedValue({
      id: 1,
      customerId: "TEST0006",
      ...inputData,
    } as any);

    // Mock dữ liệu trả về cho Meilisearch
    mockedRepo.findCustomerForMeili.mockResolvedValue({
      toJSON: () => ({ id: 1, customerId: "TEST0006" }),
    } as any);

    // Thực hiện test
    const result = await customerService.createCustomer(inputData);

    // Kiểm tra kết quả
    expect(result.message).toBe("Customer created successfully");
    expect(mockedRepo.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "TEST0006" }),
      mockTransaction,
    );
    expect(meiliService.syncOrUpdateMeiliData).toHaveBeenCalled();
  });

  //  Case 2: Trùng Prefix
  // test("nên throw lỗi Conflict nếu Prefix đã tồn tại", async () => {
  //   (customerRepository.findByIdOrMst as jest.Mock).mockResolvedValue([
  //     { customerId: "TEST0006" }, // Giả lập đã có prefix này
  //   ]);

  //   await expect(customerService.createCustomer(mockData)).rejects.toThrow(AppError);

  //   // Kiểm tra xem có đúng là lỗi Conflict không (tùy vào cách bạn định nghĩa AppError)
  //   try {
  //     await customerService.createCustomer(mockData);
  //   } catch (error: any) {
  //     expect(error.errorCode).toBe("PREFIX_ALREADY_EXISTS");
  //   }
  // });

  //  Case 3: Lỗi hệ thống (Transaction fail)
  // test("nên throw ServerError nếu có lỗi bất ngờ xảy ra", async () => {
  //   (customerRepository.findByIdOrMst as jest.Mock).mockRejectedValue(new Error("DB Crash"));

  //   await expect(customerService.createCustomer(mockData)).rejects.toThrow(AppError);
  //   // Bạn có thể check xem console.error có được gọi không
  // });

  //update
  test("should update an existing customer", async () => {});

  //delete
  test("should delete a customer", async () => {});

  //export excel
  test("should export customers to excel", async () => {});

  afterAll(async () => {
    await sequelize.close();
  });
});
