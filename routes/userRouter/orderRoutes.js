import Router from "express";
import {
  addOrder,
  deleteOrder,
  getAllOrder,
  getOrderByPrice,
  getOrderByQcBox,
  getOrderByCustomerName,
  getOrderByProductName,
  updateOrder,
  getOrderPendingAndReject,
  getOrderAcceptAndPlanning,
} from "../../controller/user/order/orderController.js";
import authenticate from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllOrder);
router.get("/pendingAndReject", authenticate, getOrderPendingAndReject);
router.get("/acceptAndPlanning", authenticate, getOrderAcceptAndPlanning);
router.get("/qcBox", authenticate, getOrderByQcBox);
router.get("/price", authenticate, getOrderByPrice);
router.get("/customerName", authenticate, getOrderByCustomerName);
router.get("/productName", authenticate, getOrderByProductName);
router.post("/", authenticate, addOrder);
router.put("/orders", authenticate, updateOrder);
router.delete("/orders", authenticate, deleteOrder);

export default router;
