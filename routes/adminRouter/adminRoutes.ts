import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeRole } from "../../middlewares/permissionMiddleware";
import { getOrderPending, updateStatusAdmin } from "../../controller/admin/adminOrderController";
import {
  deleteUserById,
  getAllUsers,
  getUserByName,
  getUserByPermission,
  getUserByPhone,
  resetPassword,
  updatePermissions,
  updateUserRole,
} from "../../controller/admin/adminUserController";
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
} from "../../controller/admin/adminMachineController";
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
} from "../../controller/admin/adminWasteNormController";
import {
  createWaveCrestCoefficient,
  deleteWaveCrestById,
  getAllWaveCrestCoefficient,
  getWaveCrestById,
  updateWaveCrestById,
} from "../../controller/admin/adminWaveCrestController";
import {
  createNewCriteria,
  deleteCriteria,
  getAllQcCriteria,
  updateCriteria,
} from "../../controller/admin/adminCriteriaController";

const router = Router();

// Admin routes for managing orders
//===============================ORDERS=====================================
router.get("/", authenticate, authorizeRole(["admin", "manager"]), getOrderPending);
router.put("/updateStatus", authenticate, authorizeRole(["admin", "manager"]), updateStatusAdmin);

//admin routes for machine paper
//===============================MACHINE PAPER=====================================
router.get("/getAllMachinePaper", authenticate, authorizeRole(["admin"]), getAllMachinePaper);
router.get("/getMachinePaperById", authenticate, authorizeRole(["admin"]), getMachinePaperById);
router.post("/createMachinePaper", authenticate, authorizeRole(["admin"]), createMachinePaper);
router.put("/updateMachinePaper", authenticate, authorizeRole(["admin"]), updateMachinePaperById);
router.delete(
  "/deleteMachinePaper",
  authenticate,
  authorizeRole(["admin"]),
  deleteMachinePaperById
);

//admin routes for machine box
//===============================MACHINE BOX=====================================
router.get("/getAllMachineBox", authenticate, authorizeRole(["admin"]), getAllMachineBox);
router.get("/getMachineBoxById", authenticate, authorizeRole(["admin"]), getMachineBoxById);
router.post("/createMachineBox", authenticate, authorizeRole(["admin"]), createMachineBox);
router.put("/updateMachineBox", authenticate, authorizeRole(["admin"]), updateMachineBoxById);
router.delete("/deleteMachineBox", authenticate, authorizeRole(["admin"]), deleteMachineBoxById);

// Admin routes for managing users
//===============================USERS=====================================
router.get("/getAllUsers", authenticate, authorizeRole(["admin"]), getAllUsers);
router.get("/getUserByName", authenticate, authorizeRole(["admin"]), getUserByName);
router.get("/getUserByPhone", authenticate, authorizeRole(["admin"]), getUserByPhone);
router.get("/getUserByPermission", authenticate, authorizeRole(["admin"]), getUserByPermission);
router.put("/updateRole", authenticate, authorizeRole(["admin"]), updateUserRole);
router.put("/updatePermission", authenticate, authorizeRole(["admin"]), updatePermissions);
router.put("/resetPassword", authenticate, authorizeRole(["admin"]), resetPassword);
router.delete("/deleteUser", authenticate, authorizeRole(["admin"]), deleteUserById);

//admin routes for waste norm paper
//===============================WASTE NORM PAPER=====================================
router.get("/getAllWasteNorm", authenticate, authorizeRole(["admin"]), getAllWasteNorm);
router.get("/getWasteNormById", authenticate, authorizeRole(["admin"]), getWasteNormById);
router.post("/createWasteNorm", authenticate, authorizeRole(["admin"]), createWasteNorm);
router.put("/updateWasteNormById", authenticate, authorizeRole(["admin"]), updateWasteNormById);
router.delete("/deleteWasteNormById", authenticate, authorizeRole(["admin"]), deleteWasteNormById);

//admin routes for waste norm box
//===============================WASTE NORM BOX=====================================
router.get("/getAllWasteBox", authenticate, authorizeRole(["admin"]), getAllWasteBox);
router.get("/getWasteBoxById", authenticate, authorizeRole(["admin"]), getWasteBoxById);
router.post("/createWasteBox", authenticate, authorizeRole(["admin"]), createWasteBox);
router.put("/updateWasteBoxById", authenticate, authorizeRole(["admin"]), updateWasteBoxById);
router.delete("/deleteWasteBoxById", authenticate, authorizeRole(["admin"]), deleteWasteBoxById);

//admin routes for wave crest coefficient
//===============================WAVE CREST COEFFICIENT=====================================
router.get("/getAllWaveCrest", authenticate, authorizeRole(["admin"]), getAllWaveCrestCoefficient);
router.get("/getWaveCrestById", authenticate, authorizeRole(["admin"]), getWaveCrestById);
router.post("/createWaveCrest", authenticate, authorizeRole(["admin"]), createWaveCrestCoefficient);
router.put("/updateWaveCrestById", authenticate, authorizeRole(["admin"]), updateWaveCrestById);
router.delete("/deleteWaveCrestById", authenticate, authorizeRole(["admin"]), deleteWaveCrestById);

//admin criteria
//===============================CRITERIA=====================================
router.get("/getCriteria", authenticate, authorizeRole(["admin"]), getAllQcCriteria);
router.post("/newCriteria", authenticate, authorizeRole(["admin"]), createNewCriteria);
router.put("/updateCriteria", authenticate, authorizeRole(["admin"]), updateCriteria);
router.delete("/deleteCriteria", authenticate, authorizeRole(["admin"]), deleteCriteria);

export default router;
