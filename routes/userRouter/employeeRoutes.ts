import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  createEmployee,
  deleteEmployee,
  exportExcelEmployee,
  getAllEmployees,
  getEmployeesByField,
  updateEmployee,
} from "../../controller/user/employee/employeeController";

const router = Router();

router.get("/", authenticate, getAllEmployees);
router.get("/filter", authenticate, getEmployeesByField);

router.post("/", authenticate, authorizeAnyPermission(["HR"]), createEmployee);
router.put("/updateEmployee", authenticate, authorizeAnyPermission(["HR"]), updateEmployee);
router.delete("/deleteEmployee", authenticate, authorizeAnyPermission(["HR"]), deleteEmployee);

router.post("/exportExcel", authenticate, authorizeAnyPermission(["HR"]), exportExcelEmployee);

export default router;
