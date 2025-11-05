import {
  cachedStatus,
  filterOrdersFromCache,
} from "../../../utils/helper/modelHelper/orderHelpers.js";
import {
  getOrderByStatus,
  createOrderService,
  deleteOrderService,
  updateOrderService,
} from "../../../service/orderService.js";
import Order from "../../../models/order/order.js";
import { CacheManager } from "../../../utils/helper/cacheManager.js";
import redisCache from "../../../configs/redisCache.js";

//===============================ACCEPT AND PLANNING=====================================

//get order status accept and planning
export const getOrderAcceptAndPlanning = async (req, res) => {
  const { userId, role } = req.user;
  const { page, pageSize, ownOnly = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  const { order } = CacheManager.keys;

  const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
  const cacheKey = order.acceptPlanning(keyRole, currentPage); //orders:admin:accept_planning:page:1

  try {
    const { isChanged } = await CacheManager.check(
      [{ model: Order, where: { status: ["accept", "planning"] } }],
      "orderAccept"
    );

    if (isChanged) {
      await CacheManager.clearOrderAcceptPlanning(keyRole);
    } else {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        console.log("✅ Data Order accept_planning from Redis");
        const parsed = JSON.parse(cachedData);
        return res.status(200).json({
          message: "Get Order from cache",
          ...parsed,
        });
      }
    }

    // Lấy data đã lọc từ cachedStatus

    const result = await getOrderByStatus({
      statusList: ["accept", "planning"],
      userId,
      role,
      page: currentPage,
      pageSize: currentPageSize,
      ownOnly,
      isPaging: true,
    });

    await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

    res.status(200).json({
      message: "Get all orders from DB with status: accept and planning",
      ...result,
    });
  } catch (error) {
    console.error("Error in getOrderAcceptAndPlanning:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrderByField = async (req, res) => {
  const { userId, role } = req.user;
  const { field, keyword, page, pageSize } = req.query;

  const fieldMap = {
    customerName: (order) => order?.Customer?.customerName,
    productName: (order) => order?.Product?.productName,
    qcBox: (order) => order?.QC_box,
    price: (order) => order?.price,
  };

  if (!fieldMap[field]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  const { order } = CacheManager.keys;

  try {
    const result = await filterOrdersFromCache({
      userId,
      role,
      keyword,
      getFieldValue: fieldMap[field],
      page,
      pageSize,
      cacheKeyPrefix: order.searchAcceptPlanning,
      message: `Get orders by ${field} from filtered cache`,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get orders by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//===============================PENDING AND REJECT=====================================

//get order pending and reject
export const getOrderPendingAndReject = async (req, res) => {
  const { userId, role } = req.user;
  const { ownOnly = false } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  const { order } = CacheManager.keys;

  const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
  const cacheKey = order.pendingReject(keyRole);

  try {
    const { isChanged } = await CacheManager.check(
      [{ model: Order, where: { status: ["pending", "reject"] } }],
      "orderPending"
    );

    if (isChanged) {
      await CacheManager.clearOrderPendingReject(keyRole);
    } else {
      const cachedResult = await cachedStatus(
        cacheKey,
        redisCache,
        "pending",
        "reject",
        userId,
        role
      );

      if (cachedResult) {
        console.log("✅ Data Order pending_reject from Redis");
        return res.status(200).json({
          message: "Get Order from cache",
          data: cachedResult,
        });
      }
    }

    const result = await getOrderByStatus({
      statusList: ["pending", "reject"],
      userId,
      role,
      ownOnly,
      isPaging: false,
    });

    await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

    res.status(200).json({
      message: "Get all orders from DB with status: pending and reject",
      ...result,
    });
  } catch (error) {
    console.error("Error in getOrderPendingAndReject:", error);
    res.status(500).json({ message: error.message });
  }
};

//add order
export const addOrder = async (req, res) => {
  const { userId } = req.user;
  const { prefix, customerId, productId, box, ...orderData } = req.body;

  try {
    const { newOrder, newOrderId } = await createOrderService({
      userId,
      prefix,
      customerId,
      productId,
      box,
      ...orderData,
    });
    res.status(201).json({ order: newOrder, orderId: newOrderId });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// update order
export const updateOrder = async (req, res) => {
  const { orderId } = req.query;
  const { box, ...orderData } = req.body;
  const { userId } = req.user;

  try {
    await updateOrderService({ userId, orderId, box, ...orderData });
    res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("update order failed:", error);
    res.status(500).json({
      message: "update order failed",
      error: error.message,
    });
  }
};

// delete order
export const deleteOrder = async (req, res) => {
  const { id } = req.query;
  const { userId } = req.user;

  try {
    await deleteOrderService({ orderId: id, userId });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order failed:", error);
    res.status(500).json({ error: error.message });
  }
};
