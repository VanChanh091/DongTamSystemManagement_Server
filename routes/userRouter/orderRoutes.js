import Router from "express";
import {
  addOrder,
  deleteOrder,
  updateOrder,
  getOrderByPrice,
  getOrderByQcBox,
  getOrderByCustomerName,
  getOrderByProductName,
  getOrderPendingAndReject,
  getOrderAcceptAndPlanning,
} from "../../controller/user/order/orderController.js";
import authenticate from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/pending-reject", authenticate, getOrderPendingAndReject);
router.get("/accept-planning", authenticate, getOrderAcceptAndPlanning);
router.get("/qcBox", authenticate, getOrderByQcBox);
router.get("/price", authenticate, getOrderByPrice);
router.get("/customerName", authenticate, getOrderByCustomerName);
router.get("/productName", authenticate, getOrderByProductName);
router.post("/", authenticate, addOrder);
router.put("/orders", authenticate, updateOrder);
router.delete("/orders", authenticate, deleteOrder);

export default router;
