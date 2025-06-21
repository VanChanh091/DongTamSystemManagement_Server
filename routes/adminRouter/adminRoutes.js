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
  getCoefficient,
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

const router = Router();

// Admin routes for managing orders
router.get("/", authenticate, getOrderPending);
router.put("/updateStatus", authenticate, updateStatusAdmin);

//admin routes for managing paper factors
router.get("/getAllPF", authenticate, getAllPaperFactors);
router.get("/getCoefficient", authenticate, getCoefficient);
router.post("/addPF", authenticate, addPaperFactor);
router.put("/updatePF", authenticate, updatePaperFactor);
router.delete("/deletePF", authenticate, deletePaperFactor);

// Admin routes for managing users
router.get("/getAllUsers", authenticate, getAllUsers);
router.get("/getUserByName", authenticate, getUserByName);
router.get("/getUserByPhone", authenticate, getUserByPhone);
router.get("/getUserByPermission", authenticate, getUserByPermission);
router.put("/updateRole", authenticate, updateUserRole);
router.put("/updatePermission", authenticate, updatePermissions);
router.put("/resetPassword", authenticate, resetPassword);
router.delete("/deleteUser", authenticate, deleteUserById);

export default router;
