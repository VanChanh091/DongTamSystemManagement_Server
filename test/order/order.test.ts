import redisCache from "../../assest/configs/redisCache";
import { CacheManager } from "../../utils/helper/cacheManager";
import {
  cachedStatus,
  filterOrdersFromCache,
  generateOrderId,
  getOrderByStatus,
  updateChildOrder,
  validateCustomerAndProduct,
  createDataTable,
} from "../../utils/helper/modelHelper/orderHelpers";

import { Order } from "../../models/order/order";
import { Box } from "../../models/order/box";
import { AppError } from "../../utils/appError";
import { orderService } from "../../service/orderService";

// mock tất cả helper
jest.mock("../../utils/helper/cacheManager");
jest.mock("../../configs/redisCache", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    set: jest.fn(),
  },
}));
jest.mock("../../utils/helper/modelHelper/orderHelpers");
jest.mock("../../models/order/order");
jest.mock("../../models/order/box");

describe("orderService", () => {
  beforeEach(() => jest.clearAllMocks());

  // 1. getOrderAcceptAndPlanning
  test("getOrderAcceptAndPlanning - lấy từ cache", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: false });
    redisCache.get.mockResolvedValue(JSON.stringify({ data: ["A"] }));

    const result = await orderService.getOrderAcceptAndPlanning(1, 20, "false", {
      userId: 1,
      role: "admin",
    });

    expect(result.data[0]).toBe("A");
  });

  test("getOrderAcceptAndPlanning - cache đổi → lấy DB", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });
    CacheManager.clearOrderAcceptPlanning = jest.fn().mockResolvedValue(true);

    (getOrderByStatus as jest.Mock as jest.Mock).mockResolvedValue({ data: ["DB-OK"] });

    const result = await orderService.getOrderAcceptAndPlanning(1, 20, "false", {
      userId: 1,
      role: "admin",
    });

    expect(result.data[0]).toBe("DB-OK");
    expect(redisCache.set).toHaveBeenCalled();
  });

  test("getOrderAcceptAndPlanning - error DB → throw ServerError", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });
    (getOrderByStatus as jest.Mock as jest.Mock).mockRejectedValue(new Error("DB ERR"));

    await expect(
      orderService.getOrderAcceptAndPlanning(1, 20, "false", { userId: 1, role: "admin" })
    ).rejects.toThrow(AppError);
  });

  // 2. getOrderPendingAndReject
  test("getOrderPendingAndReject - userId thiếu → BadRequest", async () => {
    await expect(orderService.getOrderPendingAndReject("false", { role: "admin" })).rejects.toThrow(
      AppError
    );
  });

  test("getOrderPendingAndReject - lấy từ cache qua cachedStatus", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: false });
    (cachedStatus as jest.Mock).mockResolvedValue(["CACHED"]);

    const result = await orderService.getOrderPendingAndReject("false", {
      userId: 99,
      role: "admin",
    });

    expect(result.data[0]).toBe("CACHED");
  });

  test("getOrderPendingAndReject - cache đổi → lấy DB", async () => {
    (CacheManager.check as jest.Mock).mockResolvedValue({ isChanged: true });
    CacheManager.clearOrderPendingReject = jest.fn().mockResolvedValue(true);

    (getOrderByStatus as jest.Mock).mockResolvedValue({ data: ["PENDING-DB"] });

    (redisCache.set as jest.Mock).mockResolvedValue(true);

    const result = await orderService.getOrderPendingAndReject("false", {
      userId: 10,
      role: "admin",
    });

    expect(result.data[0]).toBe("PENDING-DB");
  });

  // 3. getOrderByField
  test("getOrderByField - valid field", async () => {
    (filterOrdersFromCache as jest.Mock).mockResolvedValue({ data: ["Filtered"] });

    const result = await orderService.getOrderByField("customerName", "abc", 1, 20, {
      userId: 1,
      role: "admin",
    });

    expect(result.data[0]).toBe("Filtered");
  });

  test("getOrderByField - invalid field → BadRequest", async () => {
    await expect(
      orderService.getOrderByField("zzz", "abc", 1, 20, {
        userId: 1,
        role: "admin",
      })
    ).rejects.toThrow(AppError);
  });

  // 4. createOrder
  test("createOrder - tạo thành công, không phải box", async () => {
    (validateCustomerAndProduct as jest.Mock as jest.Mock).mockResolvedValue({ success: true });
    (generateOrderId as jest.Mock).mockResolvedValue("ORD0001");

    (Order.create as jest.Mock).mockResolvedValue({ orderId: "ORD0001", isBox: false });

    const result = await orderService.createOrder(
      { userId: 5 },
      { prefix: "ORD", customerId: 1, productId: 2 }
    );

    expect(result.orderId).toBe("ORD0001");
  });

  test("createOrder - tạo order box → tạo DataTable", async () => {
    (validateCustomerAndProduct as jest.Mock).mockResolvedValue({ success: true });
    (generateOrderId as jest.Mock).mockResolvedValue("ORD0002");

    (Order.create as jest.Mock).mockResolvedValue({ orderId: "ORD0002", isBox: true });

    (createDataTable as jest.Mock).mockResolvedValue(true);

    const result = await orderService.createOrder(
      { userId: 5 },
      { prefix: "ORD", customerId: 1, productId: 2, box: {} }
    );

    expect(createDataTable).toHaveBeenCalled();
    expect(result.orderId).toBe("ORD0002");
  });

  test("createOrder - validate fail → NotFound", async () => {
    (validateCustomerAndProduct as jest.Mock).mockResolvedValue({
      success: false,
      message: "Invalid",
    });

    await expect(
      orderService.createOrder({ userId: 1 }, { prefix: "ORD", customerId: 1, productId: 2 })
    ).rejects.toThrow(AppError);
  });

  test("createOrder - không có userId → BadRequest", async () => {
    await expect(orderService.createOrder({}, { prefix: "A" })).rejects.toThrow(AppError);
  });

  test("createOrder - lỗi createDataTable → throw ServerError", async () => {
    (validateCustomerAndProduct as jest.Mock).mockResolvedValue({ success: true });
    (generateOrderId as jest.Mock).mockResolvedValue("ERR1");

    (Order.create as jest.Mock).mockResolvedValue({ orderId: "ERR1", isBox: true });

    (createDataTable as jest.Mock).mockRejectedValue(new Error("DB fail"));

    await expect(
      orderService.createOrder(
        { userId: 1 },
        { prefix: "ORD", customerId: 1, productId: 2, box: {} }
      )
    ).rejects.toThrow(AppError);
  });

  // 5. updateOrder
  test("updateOrder - update thành công (isBox false → delete Box)", async () => {
    const fakeOrder: any = {
      orderId: "O1",
      isBox: false,
      update: jest.fn().mockResolvedValue(true),
    };

    (Order.findOne as jest.Mock).mockResolvedValue(fakeOrder);
    (Box.destroy as jest.Mock).mockResolvedValue(true);

    const result = await orderService.updateOrder({ price: 100 }, "O1");

    expect(fakeOrder.update).toHaveBeenCalled();
    expect(result.message).toBe("Order updated successfully");
  });

  test("updateOrder - update box child table", async () => {
    const fakeOrder: any = {
      orderId: "O2",
      isBox: true,
      update: jest.fn().mockResolvedValue(true),
    };

    (Order.findOne as jest.Mock).mockResolvedValue(fakeOrder);
    (updateChildOrder as jest.Mock).mockResolvedValue(true);

    await orderService.updateOrder({ box: {} }, "O2");

    expect(updateChildOrder).toHaveBeenCalled();
  });

  test("updateOrder - order không tồn tại", async () => {
    (Order.findOne as jest.Mock).mockResolvedValue(null);

    await expect(orderService.updateOrder({}, "NOTFOUND")).rejects.toThrow(AppError);
  });

  // 6. deleteOrder
  test("deleteOrder - thành công", async () => {
    (Order.destroy as jest.Mock).mockResolvedValue(1);

    const result = await orderService.deleteOrder("DEL1");
    expect(result.message).toBe("Order deleted successfully");
  });

  test("deleteOrder - order không tồn tại → NotFound", async () => {
    (Order.destroy as jest.Mock).mockResolvedValue(0);

    await expect(orderService.deleteOrder("ERR")).rejects.toThrow(AppError);
  });
});
