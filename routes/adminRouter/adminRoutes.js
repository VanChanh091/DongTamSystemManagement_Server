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
  createMachineBox,
  createMachinePaper,
  deleteMachineBoxById,
  deleteMachinePaperById,
  getAllMachineBox,
  getAllMachinePaper,
  getMachineBoxById,
  getMachinePaperById,
  updateMachineBoxById,
  updateMachinePaperById,
} from "../../controller/admin/adminMachineController.js";
import {
  createWasteBox,
  createWasteNorm,
  deleteWasteBoxById,
  deleteWasteNormById,
  getAllWasteBox,
  getAllWasteNorm,
  getWasteBoxById,
  getWasteNormById,
  updateWasteBoxById,
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

//admin routes for machine paper
router.get(
  "/getAllMachinePaper",
  authenticate,
  authorizeRole(["admin"]),
  getAllMachinePaper
);
router.get(
  "/getMachinePaperById",
  authenticate,
  authorizeRole(["admin"]),
  getMachinePaperById
);
router.post(
  "/createMachinePaper",
  authenticate,
  authorizeRole(["admin"]),
  createMachinePaper
);
router.put(
  "/updateMachinePaper",
  authenticate,
  authorizeRole(["admin"]),
  updateMachinePaperById
);
router.delete(
  "/deleteMachinePaper",
  authenticate,
  authorizeRole(["admin"]),
  deleteMachinePaperById
);

//admin routes for machine box
router.get(
  "/getAllMachineBox",
  authenticate,
  authorizeRole(["admin"]),
  getAllMachineBox
);
router.get(
  "/getMachineBoxById",
  authenticate,
  authorizeRole(["admin"]),
  getMachineBoxById
);
router.post(
  "/createMachineBox",
  authenticate,
  authorizeRole(["admin"]),
  createMachineBox
);
router.put(
  "/updateMachineBox",
  authenticate,
  authorizeRole(["admin"]),
  updateMachineBoxById
);
router.delete(
  "/deleteMachineBox",
  authenticate,
  authorizeRole(["admin"]),
  deleteMachineBoxById
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

//admin routes for waste norm paper
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

//admin routes for waste norm box
router.get(
  "/getAllWasteBox",
  authenticate,
  authorizeRole(["admin"]),
  getAllWasteBox
);
router.get(
  "/getWasteBoxById",
  authenticate,
  authorizeRole(["admin"]),
  getWasteBoxById
);
router.post(
  "/createWasteBox",
  authenticate,
  authorizeRole(["admin"]),
  createWasteBox
);
router.put(
  "/updateWasteBoxById",
  authenticate,
  authorizeRole(["admin"]),
  updateWasteBoxById
);
router.delete(
  "/deleteWasteBoxById",
  authenticate,
  authorizeRole(["admin"]),
  deleteWasteBoxById
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
