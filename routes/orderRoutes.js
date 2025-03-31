import Router from "express";
import errorMiddleWare from "../middlewares/errorMiddleWare.js";
import {
  addOrder,
  deleteOrder,
  getAllOrder,
  getOrderById,
  updateOrder,
} from "../controller/order/orderController.js";

const router = Router();

router.get("/", errorMiddleWare, getAllOrder);
router.get("/:id", errorMiddleWare, getOrderById);
router.post("/", errorMiddleWare, addOrder);
router.put("/:id", errorMiddleWare, updateOrder);
router.delete("/orders", errorMiddleWare, deleteOrder);

export default router;
