"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const customer_1 = require("../models/customer/customer");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const customerRepository_1 = require("../repository/customerRepository");
const meiliService_1 = require("../service/meiliService");
const customerService_1 = require("../service/customerService");
const database_connect_1 = require("../assets/configs/connect/database.connect");
globals_1.jest.mock("../assets/configs/connect/database.connect", () => ({
    sequelize: {
        transaction: globals_1.jest.fn(),
        authenticate: globals_1.jest.fn().mockImplementation(() => Promise.resolve()),
        close: globals_1.jest.fn().mockImplementation(() => Promise.resolve()),
    },
}));
globals_1.jest.mock("../models/customer/customer"); //models
globals_1.jest.mock("../utils/helper/transactionHelper"); //transaction
globals_1.jest.mock("../repository/customerRepository"); //repository
globals_1.jest.mock("../service/meiliService"); //meilisearch
globals_1.jest.mock("../utils/helper/modelHelper/orderHelpers"); //model helper
//mock transaction
const mockTransaction = {
    commit: globals_1.jest.fn(),
    rollback: globals_1.jest.fn(),
};
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
(0, globals_1.describe)("customer service", () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        transactionHelper_1.runInTransaction.mockImplementation(async (fn) => {
            return await fn(mockTransaction);
        });
    });
    //------------------------- CREATE -------------------------
    // Case 1: Tạo khách hàng thành công
    (0, globals_1.test)("nên tạo khách hàng thành công khi dữ liệu hợp lệ", async () => {
        const inputData = getTestData();
        // Setup giả lập
        const mockedRepo = globals_1.jest.mocked(customerRepository_1.customerRepository);
        //Check trùng (trả về mảng rỗng = không trùng)
        mockedRepo.findByIdOrMst.mockResolvedValue([]);
        // Lấy Sequence lớn nhất
        globals_1.jest.mocked(customer_1.Customer.max).mockResolvedValue(5);
        // Tạo khách hàng thành công
        mockedRepo.createCustomer.mockResolvedValue({
            id: 1,
            customerId: "TEST0006",
            ...inputData,
        });
        // Mock dữ liệu trả về cho Meilisearch
        mockedRepo.findCustomerForMeili.mockResolvedValue({
            toJSON: () => ({ id: 1, customerId: "TEST0006" }),
        });
        // Thực hiện test
        const result = await customerService_1.customerService.createCustomer(inputData);
        // Kiểm tra kết quả
        (0, globals_1.expect)(result.message).toBe("Customer created successfully");
        (0, globals_1.expect)(mockedRepo.createCustomer).toHaveBeenCalledWith(globals_1.expect.objectContaining({ customerId: "TEST0006" }), mockTransaction);
        (0, globals_1.expect)(meiliService_1.meiliService.syncOrUpdateMeiliData).toHaveBeenCalled();
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
    (0, globals_1.test)("should update an existing customer", async () => { });
    //delete
    (0, globals_1.test)("should delete a customer", async () => { });
    //export excel
    (0, globals_1.test)("should export customers to excel", async () => { });
    (0, globals_1.afterAll)(async () => {
        await database_connect_1.sequelize.close();
    });
});
//# sourceMappingURL=customer.test.js.map