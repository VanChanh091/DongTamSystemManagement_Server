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
} from "../../controller/user/warehouse/debt/debtManagementController";
import upload from "../../utils/image/uploadImage";
import {
  getDebtDeductionRequests,
  deleteDebtDeduction,
  updateDebtDeduction,
  createDebtDeduction,
  updateDebtDeductionStatus,
  requestOrVerifyUrgentOtp,
  exportExcelReportDebt,
} from "../../controller/user/warehouse/debt/debtDeductionController";
import {
  getPaymentAlocationHistory,
  exportExcelPaymentAllocations,
} from "../../controller/user/warehouse/debt/paymentAllocationController";

const router = Router();

//=============================PAYMENT ALLOCATION===================================
router.get(
  "/allocations/outbound",
  authenticate,
  authorizeAnyPermission(["accountant", "sale"]),
  getPaymentAlocationHistory,
);
router.post(
  "/allocations/export",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  exportExcelPaymentAllocations,
);

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

//=================================DEDUCTION REQUESTS===========================
router.get("/deduction-requests", authenticate, getDebtDeductionRequests);
router.post(
  "/deduction-requests",
  authenticate,
  authorizeAnyPermission(["sale"]),
  createDebtDeduction,
);
router.put(
  "/deduction-requests",
  authenticate,
  authorizeAnyPermission(["sale"]),
  updateDebtDeduction,
);
router.delete(
  "/deduction-requests",
  authenticate,
  authorizeAnyPermission(["sale"]),
  deleteDebtDeduction,
);

// Gửi OTP khẩn cấp về Telegram
router.post(
  "/deduction-requests/otp",
  authenticate,
  authorizeAnyPermission(["sale"]),
  requestOrVerifyUrgentOtp,
);

// approve or reject debt deduction request
router.put(
  "/deduction-requests/status",
  authenticate,
  authorizeAnyPermission(["admin", "manager"]),
  updateDebtDeductionStatus,
);

router.post("/deduction-requests/export", authenticate, exportExcelReportDebt);

export default router;
