import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
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
