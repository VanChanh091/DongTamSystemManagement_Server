import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  getCustomerDebtSummary,
  handleClosingDebt,
} from "../../controller/user/warehouse/debtManagementController";

const router = Router();

router.get("/", authenticate, getCustomerDebtSummary);
router.post("/", authenticate, authorizeAnyPermission(["sale", "accountant"]), handleClosingDebt);
// router.put("/", authenticate, authorizeAnyPermission(["sale", "accountant"]), updateCustomer);
// router.delete("/", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

export default router;
