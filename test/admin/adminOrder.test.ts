//===============================ADMIN ORDER=====================================

import { adminRepository } from "../../repository/adminRepository";
import { adminService } from "../../service/adminService";

jest.mock("../../repository/adminRepository", () => ({
  adminRepository: {
    findByOrderId: jest.fn(),
  },
}));

describe("AdminOrder", () => {
  beforeEach(() => jest.clearAllMocks());

  //bad request
  it("if status is invalid => BadRequest", async () => {
    await expect(adminService.updateStatusOrder("O1", "invalid" as any, "")).rejects.toThrow(
      "Invalid status"
    );
  });

  //not found
  it("if order does not exist -> NotFound", async () => {
    (adminRepository.findByOrderId as jest.Mock).mockResolvedValue(null);

    await expect(adminService.updateStatusOrder("O1", "reject", "")).rejects.toThrow(
      "Order not found"
    );
  });

  //reject order
  it("should update order status to reject with reason", async () => {
    const mockOrder = {
      set: jest.fn(),
      save: jest.fn(),
    };

    (adminRepository.findByOrderId as jest.Mock).mockResolvedValue(mockOrder);

    const result = await adminService.updateStatusOrder("A1", "reject", "lack quality");

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

    (adminRepository.findByOrderId as jest.Mock).mockResolvedValue(mockOrder);

    await adminService.updateStatusOrder("A1", "accept", "");

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

    (adminRepository.findByOrderId as jest.Mock).mockResolvedValue(mockOrder);

    await adminService.updateStatusOrder("A1", "accept", "");

    expect(mockOrder.set).toHaveBeenCalledWith({
      status: "planning",
      rejectReason: null,
    });
  });

  //server err
  it("should throw ServerError when repo throws", async () => {
    (adminRepository.findByOrderId as jest.Mock).mockRejectedValue(new Error("DB exploded"));

    await expect(adminService.updateStatusOrder("A1", "accept", "")).rejects.toThrow(
      "Server error"
    );
  });
});
