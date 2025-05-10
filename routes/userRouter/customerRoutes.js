import Router from "express";
import {
  createCustomer,
  deleteCustomer,
  getAllCustomer,
  getByCSKH,
  getByCustomerName,
  getById,
  getBySDT,
  updateCustomer,
} from "../../controller/user/customer/customerController.js";
import authenticate from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllCustomer);
router.get("/:id", authenticate, getById);
router.get("/byName/:name", authenticate, getByCustomerName);
router.get("/cskh/:cskh", authenticate, getByCSKH);
router.get("/phone/:sdt", authenticate, getBySDT);
router.post("/", authenticate, createCustomer);
router.put("/:id", authenticate, updateCustomer);
router.delete("/:id", authenticate, deleteCustomer);

export default router;
