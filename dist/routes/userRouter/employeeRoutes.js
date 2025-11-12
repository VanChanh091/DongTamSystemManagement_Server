"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const employeeController_1 = require("../../controller/user/employee/employeeController");
const router = (0, express_1.default)();
router.get("/", authMiddleware_1.default, employeeController_1.getAllEmployees);
router.get("/filter", authMiddleware_1.default, employeeController_1.getEmployeesByField);
router.post("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["HR"]), employeeController_1.createEmployee);
router.put("/updateEmployee", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["HR"]), employeeController_1.updateEmployee);
router.delete("/deleteEmployee", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["HR"]), employeeController_1.deleteEmployee);
router.post("/exportExcel", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["HR"]), employeeController_1.exportExcelEmployee);
exports.default = router;
//# sourceMappingURL=employeeRoutes.js.map