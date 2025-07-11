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
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllCustomer);
router.get("/:id", authenticate, authorizeAnyPermission(["sale"]), getById);
router.get(
  "/byName/:name",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getByCustomerName
);
router.get(
  "/cskh/:cskh",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getByCSKH
);
router.get(
  "/phone/:sdt",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getBySDT
);
router.post(
  "/",
  authenticate,
  authorizeAnyPermission(["sale"]),
  createCustomer
);
router.put(
  "/:id",
  authenticate,
  authorizeAnyPermission(["sale"]),
  updateCustomer
);
router.delete(
  "/:id",
  authenticate,
  authorizeAnyPermission(["sale"]),
  deleteCustomer
);

export default router;
