import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getOrderPending,
  updateStatusAdmin,
} from "../../controller/admin/adminOrderController.js";
import {
  addPaperFactor,
  deletePaperFactor,
  getAllPaperFactors,
  updatePaperFactor,
} from "../../controller/admin/adminPaperFactorController.js";
import {
  deleteUserById,
  getAllUsers,
  getUserByName,
  getUserByPermission,
  getUserByPhone,
  resetPassword,
  updatePermissions,
  updateUserRole,
} from "../../controller/admin/adminUserController.js";
import {
  createMachine,
  deleteMachineById,
  getAllMachine,
  getMachineById,
  updateMachineById,
} from "../../controller/admin/adminMachinePaperController.js";
import { authorizeRole } from "../../middlewares/permissionMiddleware.js";

const router = Router();

// Admin routes for managing orders
router.get(
  "/",
  authenticate,
  authorizeRole(["admin", "manager"]),
  getOrderPending
);
router.put(
  "/updateStatus",
  authenticate,
  authorizeRole(["admin", "manager"]),
  updateStatusAdmin
);

//admin routes for managing paper factors
router.get(
  "/getAllPF",
  authenticate,
  authorizeRole(["admin"]),
  getAllPaperFactors
);
router.post("/addPF", authenticate, authorizeRole(["admin"]), addPaperFactor);
router.put(
  "/updatePF",
  authenticate,
  authorizeRole(["admin"]),
  updatePaperFactor
);
router.delete(
  "/deletePF",
  authenticate,
  authorizeRole(["admin"]),
  deletePaperFactor
);

//admin routes for manage time running machine
router.get(
  "/getAllMachine",
  authenticate,
  authorizeRole(["admin"]),
  getAllMachine
);
router.get(
  "/getMachineById",
  authenticate,
  authorizeRole(["admin"]),
  getMachineById
);
router.post(
  "/createMachine",
  authenticate,
  authorizeRole(["admin"]),
  createMachine
);
router.put(
  "/updateMachineById",
  authenticate,
  authorizeRole(["admin"]),
  updateMachineById
);
router.delete(
  "/deleteMachineById",
  authenticate,
  authorizeRole(["admin"]),
  deleteMachineById
);

// Admin routes for managing users
router.get("/getAllUsers", authenticate, authorizeRole(["admin"]), getAllUsers);
router.get(
  "/getUserByName",
  authenticate,
  authorizeRole(["admin"]),
  getUserByName
);
router.get(
  "/getUserByPhone",
  authenticate,
  authorizeRole(["admin"]),
  getUserByPhone
);
router.get(
  "/getUserByPermission",
  authenticate,
  authorizeRole(["admin"]),
  getUserByPermission
);
router.put(
  "/updateRole",
  authenticate,
  authorizeRole(["admin"]),
  updateUserRole
);
router.put(
  "/updatePermission",
  authenticate,
  authorizeRole(["admin"]),
  updatePermissions
);
router.put(
  "/resetPassword",
  authenticate,
  authorizeRole(["admin"]),
  resetPassword
);
router.delete(
  "/deleteUser",
  authenticate,
  authorizeRole(["admin"]),
  deleteUserById
);

export default router;
