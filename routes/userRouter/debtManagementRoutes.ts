import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAccess } from "../../middlewares/permissionMiddleware";
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
import { AuthorizeAccessParams } from "../../interface/types";
import { authorizeSaleAccess } from "./orderRoutes";

const router = Router();

const authorizeDebtAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["Accountant", ...departments])],
    permissions: [...new Set(["accountant", ...permissions])],
    requireDept,
  });

//=============================PAYMENT ALLOCATION===================================
router.get(
  "/allocations/outbound",
  authenticate,
  authorizeDebtAccess({ departments: ["Sale"], permissions: ["sale"] }),
  getPaymentAlocationHistory,
);
router.post(
  "/allocations/export",
  authenticate,
  authorizeDebtAccess(),
  exportExcelPaymentAllocations,
);

//=================================CLOSING DEBT=======================================
router.get("/closing-debt", authenticate, getCustomerDebtSummary);
router.post("/closing-debt", authenticate, authorizeDebtAccess(), handleClosingDebt);
router.post("/closing-debt/export", authenticate, authorizeDebtAccess(), exportDebtCustomer);

//=================================PAYMENT=======================================
router.post("/payment", authenticate, authorizeDebtAccess(), paymentDebtByCustomerId);
router.post(
  "/payment/import",
  authenticate,
  upload.single("file"),
  authorizeDebtAccess(),
  importAmountPayment,
);
router.put("/payment", authenticate, authorizeDebtAccess(), writeOffDebt);

//=================================DEDUCTION REQUESTS===========================
router.get(
  "/deduction-requests",
  authenticate,
  authorizeAccess({ departments: ["Accountant", "Sale"], permissions: ["accountant", "sale"] }),
  getDebtDeductionRequests,
);
router.post("/deduction-requests", authenticate, authorizeSaleAccess(), createDebtDeduction);
router.put("/deduction-requests", authenticate, authorizeSaleAccess(), updateDebtDeduction);
router.delete("/deduction-requests", authenticate, authorizeSaleAccess(), deleteDebtDeduction);

// Gửi OTP khẩn cấp về Telegram
router.post(
  "/deduction-requests/otp",
  authenticate,
  authorizeSaleAccess(),
  requestOrVerifyUrgentOtp,
);

// approve or reject debt deduction request
router.put(
  "/deduction-requests/status",
  authenticate,
  authorizeAccess({ departments: ["Accountant"], permissions: [], requireDept: true }),
  updateDebtDeductionStatus,
);

router.post("/deduction-requests/export", authenticate, exportExcelReportDebt);

export default router;
