import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  createEmployee,
  deleteEmployee,
  exportExcelEmployee,
  getEmployeeByPosition,
  getEmployees,
  updateEmployee,
} from "../../controller/user/employee/employeeController";

const router = Router();

router.get("/", authenticate, getEmployees);
router.get("/position", authenticate, getEmployeeByPosition);

router.post("/", authenticate, authorizeAnyPermission(["HR"]), createEmployee);
router.put("/", authenticate, authorizeAnyPermission(["HR"]), updateEmployee);
router.delete("/", authenticate, authorizeAnyPermission(["HR"]), deleteEmployee);

router.post("/export", authenticate, authorizeAnyPermission(["HR"]), exportExcelEmployee);

export default router;
