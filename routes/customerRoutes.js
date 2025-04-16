import Router from "express";
import errorMiddleWare from "../middlewares/errorMiddleWare.js";
import {
  createCustomer,
  deleteCustomer,
  getAllCustomer,
  getByCSKH,
  getByCustomerName,
  getById,
  getBySDT,
  updateCustomer,
} from "../controller/customer/customerController.js";

const router = Router();

router.get("/", errorMiddleWare, getAllCustomer);
router.get("/:id", errorMiddleWare, getById);
router.get("/byName/:name", errorMiddleWare, getByCustomerName);
router.get("/cskh/:cskh", errorMiddleWare, getByCSKH);
router.get("/phone/:sdt", errorMiddleWare, getBySDT);
router.post("/", errorMiddleWare, createCustomer);
router.put("/:id", errorMiddleWare, updateCustomer);
router.delete("/:id", errorMiddleWare, deleteCustomer);

export default router;
