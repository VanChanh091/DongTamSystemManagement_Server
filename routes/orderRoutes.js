import Router from "express";
import errorMiddleWare from "../middlewares/errorMiddleWare.js";
import {
  addOrder,
  deleteOrder,
  getAllOrder,
  getOrderByPrice,
  getOrderByQcBox,
  getOrderByCustomerName,
  getOrderByProductName,
  getOrderByTypeProduct,
  updateOrder,
} from "../controller/order/orderController.js";

const router = Router();

router.get("/", errorMiddleWare, getAllOrder);
router.get("/qcBox", errorMiddleWare, getOrderByQcBox);
router.get("/price", errorMiddleWare, getOrderByPrice);
router.get("/customerName", errorMiddleWare, getOrderByCustomerName);
router.get("/productName", errorMiddleWare, getOrderByProductName);
router.get("/typeProduct", errorMiddleWare, getOrderByTypeProduct);
router.post("/", errorMiddleWare, addOrder);
router.put("/orders", errorMiddleWare, updateOrder);
router.delete("/orders", errorMiddleWare, deleteOrder);

export default router;
