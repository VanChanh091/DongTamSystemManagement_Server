import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import { authorizeRole } from "../../middlewares/permissionMiddleware.js";
import {
  getOrderPending,
  updateStatusAdmin,
} from "../../controller/admin/adminOrderController.js";
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
import {
  createWasteNorm,
  deleteWasteNormById,
  getAllWasteNorm,
  getWasteNormById,
  updateWasteNormById,
} from "../../controller/admin/adminWasteNormController.js";
import {
  createWaveCrestCoefficient,
  deleteWaveCrestById,
  getAllWaveCrestCoefficient,
  getWaveCrestById,
  updateWaveCrestById,
} from "../../controller/admin/adminWaveCrestController.js";

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

//admin routes for waste norm
router.get(
  "/getAllWasteNorm",
  authenticate,
  authorizeRole(["admin"]),
  getAllWasteNorm
);
router.get(
  "/getWasteNormById",
  authenticate,
  authorizeRole(["admin"]),
  getWasteNormById
);
router.post(
  "/createWasteNorm",
  authenticate,
  authorizeRole(["admin"]),
  createWasteNorm
);
router.put(
  "/updateWasteNormById",
  authenticate,
  authorizeRole(["admin"]),
  updateWasteNormById
);
router.delete(
  "/deleteWasteNormById",
  authenticate,
  authorizeRole(["admin"]),
  deleteWasteNormById
);

//admin routes for wave crest coefficient
router.get(
  "/getAllWaveCrest",
  authenticate,
  authorizeRole(["admin"]),
  getAllWaveCrestCoefficient
);
router.get(
  "/getWaveCrestById",
  authenticate,
  authorizeRole(["admin"]),
  getWaveCrestById
);
router.post(
  "/createWaveCrest",
  authenticate,
  authorizeRole(["admin"]),
  createWaveCrestCoefficient
);
router.put(
  "/updateWaveCrestById",
  authenticate,
  authorizeRole(["admin"]),
  updateWaveCrestById
);
router.delete(
  "/deleteWaveCrestById",
  authenticate,
  authorizeRole(["admin"]),
  deleteWaveCrestById
);

export default router;
