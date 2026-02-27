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
import {
  createFluteRatio,
  deleteFluteRatio,
  getAllFluteRatio,
  updateFluteRatio,
} from "../../controller/admin/adminFluteRatioController";
import {
  createNewVehicle,
  deleteVehicle,
  getAllVehicle,
  updateVehicle,
} from "../../controller/admin/adminVehicleController";

const router = Router();

// Admin routes for managing orders
//===============================ORDERS=====================================
router.get("/", authenticate, authorizeRole(["admin", "manager"]), getOrderPending);
router.put("/updateStatus", authenticate, authorizeRole(["admin", "manager"]), updateStatusAdmin);

// router.get("/orders", authenticate, authorizeRole(["admin", "manager"]), getOrderPending);
// router.put("/orders", authenticate, authorizeRole(["admin", "manager"]), updateStatusAdmin);

//===============================USERS=====================================
router.get("/getAllUsers", authenticate, authorizeRole(["admin"]), getAllUsers);
router.get("/getUserByName", authenticate, authorizeRole(["admin"]), getUserByName);
router.get("/getUserByPhone", authenticate, authorizeRole(["admin"]), getUserByPhone);
router.get("/getUserByPermission", authenticate, authorizeRole(["admin"]), getUserByPermission);
router.put("/updateRole", authenticate, authorizeRole(["admin"]), updateUserRole);
router.put("/updatePermission", authenticate, authorizeRole(["admin"]), updatePermissions);
router.put("/resetPassword", authenticate, authorizeRole(["admin"]), resetPassword);
router.delete("/deleteUser", authenticate, authorizeRole(["admin"]), deleteUserById);

// router.get("/users", authenticate, authorizeRole(["admin"]), getAllUsers);
// router.put("/users", authenticate, authorizeRole(["admin"]), updateInfoUser);
// router.delete("/users", authenticate, authorizeRole(["admin"]), deleteUserById);

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
  deleteMachinePaperById,
);

// router.get("/machine-papers", authenticate, authorizeRole(["admin"]), getMachinePaper);
// router.post("/machine-papers", authenticate, authorizeRole(["admin"]), createMachinePaper);
// router.put("/machine-papers", authenticate, authorizeRole(["admin"]), updateMachinePaper);
// router.delete("/machine-papers", authenticate, authorizeRole(["admin"]), deleteMachinePaper);

//===============================MACHINE BOX=====================================
router.get("/getAllMachineBox", authenticate, authorizeRole(["admin"]), getAllMachineBox);
router.get("/getMachineBoxById", authenticate, authorizeRole(["admin"]), getMachineBoxById);
router.post("/createMachineBox", authenticate, authorizeRole(["admin"]), createMachineBox);
router.put("/updateMachineBox", authenticate, authorizeRole(["admin"]), updateMachineBoxById);
router.delete("/deleteMachineBox", authenticate, authorizeRole(["admin"]), deleteMachineBoxById);

// router.get("/machine-boxes", authenticate, authorizeRole(["admin"]), getMachineBox);
// router.post("/machine-boxes", authenticate, authorizeRole(["admin"]), createMachineBox);
// router.put("/machine-boxes", authenticate, authorizeRole(["admin"]), updateMachineBox);
// router.delete("/machine-boxes", authenticate, authorizeRole(["admin"]), deleteMachineBox);

//===============================WASTE NORM PAPER=====================================
router.get("/getAllWasteNorm", authenticate, authorizeRole(["admin"]), getAllWasteNorm);
router.get("/getWasteNormById", authenticate, authorizeRole(["admin"]), getWasteNormById);
router.post("/createWasteNorm", authenticate, authorizeRole(["admin"]), createWasteNorm);
router.put("/updateWasteNormById", authenticate, authorizeRole(["admin"]), updateWasteNormById);
router.delete("/deleteWasteNormById", authenticate, authorizeRole(["admin"]), deleteWasteNormById);

// router.get("/waste-norms/papers", authenticate, authorizeRole(["admin"]), getAllWasteNorm);
// router.post("/waste-norms/papers", authenticate, authorizeRole(["admin"]), createWasteNorm);
// router.put("/waste-norms/papers", authenticate, authorizeRole(["admin"]), updateWasteNorm);
// router.delete("/waste-norms/papers", authenticate, authorizeRole(["admin"]), deleteWasteNorm);

//===============================WASTE NORM BOX=====================================
router.get("/getAllWasteBox", authenticate, authorizeRole(["admin"]), getAllWasteBox);
router.get("/getWasteBoxById", authenticate, authorizeRole(["admin"]), getWasteBoxById);
router.post("/createWasteBox", authenticate, authorizeRole(["admin"]), createWasteBox);
router.put("/updateWasteBoxById", authenticate, authorizeRole(["admin"]), updateWasteBoxById);
router.delete("/deleteWasteBoxById", authenticate, authorizeRole(["admin"]), deleteWasteBoxById);

// router.get("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), getAllWasteBox);
// router.post("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), createWasteBox);
// router.put("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), updateWasteBoxById);
// router.delete("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), deleteWasteBoxById);

//===============================WAVE CREST COEFFICIENT=====================================
router.get("/getAllWaveCrest", authenticate, authorizeRole(["admin"]), getAllWaveCrestCoefficient);
router.get("/getWaveCrestById", authenticate, authorizeRole(["admin"]), getWaveCrestById);
router.post("/createWaveCrest", authenticate, authorizeRole(["admin"]), createWaveCrestCoefficient);
router.put("/updateWaveCrestById", authenticate, authorizeRole(["admin"]), updateWaveCrestById);
router.delete("/deleteWaveCrestById", authenticate, authorizeRole(["admin"]), deleteWaveCrestById);

// router.get("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), getAllWaveCrestCoefficient);
// router.post("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), createWaveCrestCoeff);
// router.put("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), updateWaveCrestById);
// router.delete("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), deleteWaveCrestById);

//===============================CRITERIA=====================================
router.get("/getCriteria", authenticate, authorizeRole(["admin"]), getAllQcCriteria);
router.post("/newCriteria", authenticate, authorizeRole(["admin"]), createNewCriteria);
router.put("/updateCriteria", authenticate, authorizeRole(["admin"]), updateCriteria);
router.delete("/deleteCriteria", authenticate, authorizeRole(["admin"]), deleteCriteria);

// router.get("/criterias", authenticate, authorizeRole(["admin"]), getAllQcCriteria);
// router.post("/criterias", authenticate, authorizeRole(["admin"]), createNewCriteria);
// router.put("/criterias", authenticate, authorizeRole(["admin"]), updateCriteria);
// router.delete("/criterias", authenticate, authorizeRole(["admin"]), deleteCriteria);

//===============================FLUTE RATIO=====================================
router.get("/getFluteRatio", authenticate, authorizeRole(["admin"]), getAllFluteRatio);
router.post("/createFluteRatio", authenticate, authorizeRole(["admin"]), createFluteRatio);
router.put("/updateFluteRatio", authenticate, authorizeRole(["admin"]), updateFluteRatio);
router.delete("/deleteFluteRatio", authenticate, authorizeRole(["admin"]), deleteFluteRatio);

// router.get("/flute-ratios", authenticate, authorizeRole(["admin"]), getAllFluteRatio);
// router.post("/flute-ratios", authenticate, authorizeRole(["admin"]), createFluteRatio);
// router.put("/flute-ratios", authenticate, authorizeRole(["admin"]), updateFluteRatio);
// router.delete("/flute-ratios", authenticate, authorizeRole(["admin"]), deleteFluteRatio);

//===============================VEHICLE=====================================
router.get("/getAllVehicle", authenticate, getAllVehicle);
router.post("/newVehicle", authenticate, authorizeRole(["admin", "manager"]), createNewVehicle);
router.put("/updateVehicle", authenticate, authorizeRole(["admin", "manager"]), updateVehicle);
router.delete("/deleteVehicle", authenticate, authorizeRole(["admin", "manager"]), deleteVehicle);

// router.get("/vehicles", authenticate, getAllVehicle);
// router.post("/vehicles", authenticate, authorizeRole(["admin", "manager"]), createNewVehicle);
// router.put("/vehicles", authenticate, authorizeRole(["admin", "manager"]), updateVehicle);
// router.delete("/vehicles", authenticate, authorizeRole(["admin", "manager"]), deleteVehicle);

export default router;
