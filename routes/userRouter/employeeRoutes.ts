import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAccess, authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  createEmployee,
  deleteEmployee,
  exportExcelEmployee,
  getEmployeeByPosition,
  getEmployees,
  updateEmployee,
} from "../../controller/user/employee/employeeController";
import { AuthorizeAccessParams } from "../../interface/types";

const router = Router();

const authorizeEmployeeAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["HR", ...departments])],
    permissions: [...new Set(["HR", ...permissions])],
    requireDept,
  });

router.get("/", authenticate, authorizeEmployeeAccess(), getEmployees);
router.get("/position", authenticate, getEmployeeByPosition); // using for report production

router.post("/", authenticate, authorizeEmployeeAccess(), createEmployee);
router.put("/", authenticate, authorizeEmployeeAccess(), updateEmployee);
router.delete("/", authenticate, authorizeEmployeeAccess(), deleteEmployee);

router.post("/export", authenticate, authorizeEmployeeAccess(), exportExcelEmployee);

export default router;
