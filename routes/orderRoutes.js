import Router from "express";
import errorMiddleWare from "../middlewares/errorMiddleWare.js";
import {
  addOrder,
  deleteOrder,
  getAllOrder,
  getOrderByCustomerName,
  getOrderByProductName,
  getOrderByQcBox,
  getOrderByTypeProduct,
  updateOrder,
} from "../controller/order/orderController.js";

const router = Router();

router.get("/", errorMiddleWare, getAllOrder);
router.get("/customerName", errorMiddleWare, getOrderByCustomerName);
router.get("/productName", errorMiddleWare, getOrderByProductName);
router.get("/typeProduct", errorMiddleWare, getOrderByTypeProduct);
router.get("/qcBox", errorMiddleWare, getOrderByQcBox);
router.post("/", errorMiddleWare, addOrder);
router.put("/orders", errorMiddleWare, updateOrder);
router.delete("/orders", errorMiddleWare, deleteOrder);

export default router;
