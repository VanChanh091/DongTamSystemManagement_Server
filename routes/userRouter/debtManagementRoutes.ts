import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  exportDebtCustomer,
  getCustomerDebtSummary,
  handleClosingDebt,
  importAmountPayment,
  paymentDebtByCustomerId,
  writeOffDebt,
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
router.post(
  "/closing-debt/export",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  exportDebtCustomer,
);

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
router.put("/payment", authenticate, authorizeAnyPermission(["accountant"]), writeOffDebt);

export default router;
