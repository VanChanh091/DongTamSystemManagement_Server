"use strict";
//===============================ADMIN ORDER=====================================
Object.defineProperty(exports, "__esModule", { value: true });
const adminRepository_1 = require("../../repository/adminRepository");
const adminService_1 = require("../../service/admin/adminService");
jest.mock("../../repository/adminRepository", () => ({
    adminRepository: {
        findByOrderId: jest.fn(),
    },
}));
describe("AdminOrder", () => {
    beforeEach(() => jest.clearAllMocks());
    //bad request
    it("if status is invalid => BadRequest", async () => {
        await expect(adminService_1.adminService.updateStatusOrder("O1", "invalid", "")).rejects.toThrow("Invalid status");
    });
    //not found
    it("if order does not exist -> NotFound", async () => {
        adminRepository_1.adminRepository.findByOrderId.mockResolvedValue(null);
        await expect(adminService_1.adminService.updateStatusOrder("O1", "reject", "")).rejects.toThrow("Order not found");
    });
    //reject order
    it("should update order status to reject with reason", async () => {
        const mockOrder = {
            set: jest.fn(),
            save: jest.fn(),
        };
        adminRepository_1.adminRepository.findByOrderId.mockResolvedValue(mockOrder);
        const result = await adminService_1.adminService.updateStatusOrder("A1", "reject", "lack quality");
        expect(mockOrder.set).toHaveBeenCalledWith({
            status: "reject",
            rejectReason: "lack quality",
        });
        expect(mockOrder.save).toHaveBeenCalled();
        expect(result.order).toBe(mockOrder);
    });
    //typeProduct != phí khác
    it("should update order to accept when typeProduct != Phí Khác", async () => {
        const mockOrder = {
            Product: { typeProduct: "Giấy Tấm" },
            set: jest.fn(),
            save: jest.fn(),
        };
        adminRepository_1.adminRepository.findByOrderId.mockResolvedValue(mockOrder);
        await adminService_1.adminService.updateStatusOrder("A1", "accept", "");
        expect(mockOrder.set).toHaveBeenCalledWith({
            status: "accept",
            rejectReason: null,
        });
    });
    //typeProduct == phí khác
    it("should update order to planning when typeProduct = 'Phí Khác'", async () => {
        const mockOrder = {
            Product: { typeProduct: "Phí Khác" },
            set: jest.fn(),
            save: jest.fn(),
        };
        adminRepository_1.adminRepository.findByOrderId.mockResolvedValue(mockOrder);
        await adminService_1.adminService.updateStatusOrder("A1", "accept", "");
        expect(mockOrder.set).toHaveBeenCalledWith({
            status: "planning",
            rejectReason: null,
        });
    });
    //server err
    it("should throw ServerError when repo throws", async () => {
        adminRepository_1.adminRepository.findByOrderId.mockRejectedValue(new Error("DB exploded"));
        await expect(adminService_1.adminService.updateStatusOrder("A1", "accept", "")).rejects.toThrow("Server error");
    });
});
//# sourceMappingURL=adminOrder.test.js.map