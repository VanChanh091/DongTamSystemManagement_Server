import Router from "express";
import errorMiddleWare from "../middlewares/errorMiddleWare.js";
import {
  createCustomer,
  deleteCustomer,
  getAllCustomer,
  getById,
  getByName,
  // renewCustomer,
  updateCustomer,
} from "../controller/customerController.js";

const router = Router();

router.get("/", errorMiddleWare, getAllCustomer);
router.get("/:id", errorMiddleWare, getById);
router.get("/search/:name", errorMiddleWare, getByName);
// router.get("/renew", errorMiddleWare, renewCustomer);
router.post("/", errorMiddleWare, createCustomer);
router.put("/:id", errorMiddleWare, updateCustomer);
router.delete("/:id", errorMiddleWare, deleteCustomer);

export default router;
