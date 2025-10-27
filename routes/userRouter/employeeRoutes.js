import Router from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";
import {
  createEmployee,
  deleteEmployee,
  exportExcelEmployee,
  getAllEmployees,
  getEmployeesByField,
  updateEmployee,
} from "../../controller/user/employee/employeeController.js";

const router = Router();

router.get("/", authenticate, getAllEmployees);
router.get("/filter", authenticate, getEmployeesByField);

router.post("/", authenticate, authorizeAnyPermission(["HR"]), createEmployee);
router.put("/updateEmployee", authenticate, authorizeAnyPermission(["HR"]), updateEmployee);
router.delete("/deleteEmployee", authenticate, authorizeAnyPermission(["HR"]), deleteEmployee);

router.post("/exportExcel", authenticate, authorizeAnyPermission(["HR"]), exportExcelEmployee);

export default router;
