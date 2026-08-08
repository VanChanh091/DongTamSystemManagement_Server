import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  getCustomerDebtSummary,
  handleClosingDebt,
  importAmountPayment,
  paymentDebtByCustomerId,
} from "../../controller/user/warehouse/debtManagementController";
import upload from "../../utils/image/uploadImage";

const router = Router();

//=================================CLOSING DEBT=======================================
router.get("/closing-debt", authenticate, getCustomerDebtSummary);
router.post(
  "/closing-debt",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  handleClosingDebt,
);
// router.put("/", authenticate, authorizeAnyPermission(["sale", "accountant"]), updateCustomer);
// router.delete("/", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

//=================================PAYMENT=======================================
router.post(
  "/payment",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  paymentDebtByCustomerId,
);
router.post(
  "/payment/import",
  authenticate,
  upload.single("file"),
  authorizeAnyPermission(["accountant"]),
  importAmountPayment,
);

export default router;
