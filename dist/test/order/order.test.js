"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const cacheManager_1 = require("../../utils/helper/cacheManager");
const orderHelpers_1 = require("../../utils/helper/modelHelper/orderHelpers");
const order_1 = require("../../models/order/order");
const box_1 = require("../../models/order/box");
const appError_1 = require("../../utils/appError");
const orderService_1 = require("../../service/orderService");
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
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: false });
        redisCache_1.default.get.mockResolvedValue(JSON.stringify({ data: ["A"] }));
        const result = await orderService_1.orderService.getOrderAcceptAndPlanning(1, 20, "false", {
            userId: 1,
            role: "admin",
        });
        expect(result.data[0]).toBe("A");
    });
    test("getOrderAcceptAndPlanning - cache đổi → lấy DB", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        cacheManager_1.CacheManager.clearOrderAcceptPlanning = jest.fn().mockResolvedValue(true);
        orderHelpers_1.getOrderByStatus.mockResolvedValue({ data: ["DB-OK"] });
        const result = await orderService_1.orderService.getOrderAcceptAndPlanning(1, 20, "false", {
            userId: 1,
            role: "admin",
        });
        expect(result.data[0]).toBe("DB-OK");
        expect(redisCache_1.default.set).toHaveBeenCalled();
    });
    test("getOrderAcceptAndPlanning - error DB → throw ServerError", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        orderHelpers_1.getOrderByStatus.mockRejectedValue(new Error("DB ERR"));
        await expect(orderService_1.orderService.getOrderAcceptAndPlanning(1, 20, "false", { userId: 1, role: "admin" })).rejects.toThrow(appError_1.AppError);
    });
    // 2. getOrderPendingAndReject
    test("getOrderPendingAndReject - userId thiếu → BadRequest", async () => {
        await expect(orderService_1.orderService.getOrderPendingAndReject("false", { role: "admin" })).rejects.toThrow(appError_1.AppError);
    });
    test("getOrderPendingAndReject - lấy từ cache qua cachedStatus", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: false });
        orderHelpers_1.cachedStatus.mockResolvedValue(["CACHED"]);
        const result = await orderService_1.orderService.getOrderPendingAndReject("false", {
            userId: 99,
            role: "admin",
        });
        expect(result.data[0]).toBe("CACHED");
    });
    test("getOrderPendingAndReject - cache đổi → lấy DB", async () => {
        cacheManager_1.CacheManager.check.mockResolvedValue({ isChanged: true });
        cacheManager_1.CacheManager.clearOrderPendingReject = jest.fn().mockResolvedValue(true);
        orderHelpers_1.getOrderByStatus.mockResolvedValue({ data: ["PENDING-DB"] });
        redisCache_1.default.set.mockResolvedValue(true);
        const result = await orderService_1.orderService.getOrderPendingAndReject("false", {
            userId: 10,
            role: "admin",
        });
        expect(result.data[0]).toBe("PENDING-DB");
    });
    // 3. getOrderByField
    test("getOrderByField - valid field", async () => {
        orderHelpers_1.filterOrdersFromCache.mockResolvedValue({ data: ["Filtered"] });
        const result = await orderService_1.orderService.getOrderByField("customerName", "abc", 1, 20, {
            userId: 1,
            role: "admin",
        });
        expect(result.data[0]).toBe("Filtered");
    });
    test("getOrderByField - invalid field → BadRequest", async () => {
        await expect(orderService_1.orderService.getOrderByField("zzz", "abc", 1, 20, {
            userId: 1,
            role: "admin",
        })).rejects.toThrow(appError_1.AppError);
    });
    // 4. createOrder
    test("createOrder - tạo thành công, không phải box", async () => {
        orderHelpers_1.validateCustomerAndProduct.mockResolvedValue({ success: true });
        orderHelpers_1.generateOrderId.mockResolvedValue("ORD0001");
        order_1.Order.create.mockResolvedValue({ orderId: "ORD0001", isBox: false });
        const result = await orderService_1.orderService.createOrder({ userId: 5 }, { prefix: "ORD", customerId: 1, productId: 2 });
        expect(result.orderId).toBe("ORD0001");
    });
    test("createOrder - tạo order box → tạo DataTable", async () => {
        orderHelpers_1.validateCustomerAndProduct.mockResolvedValue({ success: true });
        orderHelpers_1.generateOrderId.mockResolvedValue("ORD0002");
        order_1.Order.create.mockResolvedValue({ orderId: "ORD0002", isBox: true });
        orderHelpers_1.createDataTable.mockResolvedValue(true);
        const result = await orderService_1.orderService.createOrder({ userId: 5 }, { prefix: "ORD", customerId: 1, productId: 2, box: {} });
        expect(orderHelpers_1.createDataTable).toHaveBeenCalled();
        expect(result.orderId).toBe("ORD0002");
    });
    test("createOrder - validate fail → NotFound", async () => {
        orderHelpers_1.validateCustomerAndProduct.mockResolvedValue({
            success: false,
            message: "Invalid",
        });
        await expect(orderService_1.orderService.createOrder({ userId: 1 }, { prefix: "ORD", customerId: 1, productId: 2 })).rejects.toThrow(appError_1.AppError);
    });
    test("createOrder - không có userId → BadRequest", async () => {
        await expect(orderService_1.orderService.createOrder({}, { prefix: "A" })).rejects.toThrow(appError_1.AppError);
    });
    test("createOrder - lỗi createDataTable → throw ServerError", async () => {
        orderHelpers_1.validateCustomerAndProduct.mockResolvedValue({ success: true });
        orderHelpers_1.generateOrderId.mockResolvedValue("ERR1");
        order_1.Order.create.mockResolvedValue({ orderId: "ERR1", isBox: true });
        orderHelpers_1.createDataTable.mockRejectedValue(new Error("DB fail"));
        await expect(orderService_1.orderService.createOrder({ userId: 1 }, { prefix: "ORD", customerId: 1, productId: 2, box: {} })).rejects.toThrow(appError_1.AppError);
    });
    // 5. updateOrder
    test("updateOrder - update thành công (isBox false → delete Box)", async () => {
        const fakeOrder = {
            orderId: "O1",
            isBox: false,
            update: jest.fn().mockResolvedValue(true),
        };
        order_1.Order.findOne.mockResolvedValue(fakeOrder);
        box_1.Box.destroy.mockResolvedValue(true);
        const result = await orderService_1.orderService.updateOrder({ price: 100 }, "O1");
        expect(fakeOrder.update).toHaveBeenCalled();
        expect(result.message).toBe("Order updated successfully");
    });
    test("updateOrder - update box child table", async () => {
        const fakeOrder = {
            orderId: "O2",
            isBox: true,
            update: jest.fn().mockResolvedValue(true),
        };
        order_1.Order.findOne.mockResolvedValue(fakeOrder);
        orderHelpers_1.updateChildOrder.mockResolvedValue(true);
        await orderService_1.orderService.updateOrder({ box: {} }, "O2");
        expect(orderHelpers_1.updateChildOrder).toHaveBeenCalled();
    });
    test("updateOrder - order không tồn tại", async () => {
        order_1.Order.findOne.mockResolvedValue(null);
        await expect(orderService_1.orderService.updateOrder({}, "NOTFOUND")).rejects.toThrow(appError_1.AppError);
    });
    // 6. deleteOrder
    test("deleteOrder - thành công", async () => {
        order_1.Order.destroy.mockResolvedValue(1);
        const result = await orderService_1.orderService.deleteOrder("DEL1");
        expect(result.message).toBe("Order deleted successfully");
    });
    test("deleteOrder - order không tồn tại → NotFound", async () => {
        order_1.Order.destroy.mockResolvedValue(0);
        await expect(orderService_1.orderService.deleteOrder("ERR")).rejects.toThrow(appError_1.AppError);
    });
});
//# sourceMappingURL=order.test.js.map