import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeRole } from "../../middlewares/permissionMiddleware";
import { getOrderPending, updateStatusAdmin } from "../../controller/admin/adminOrderController";
import {
  deleteUser,
  getUsersAdmin,
  updateInfoUser,
} from "../../controller/admin/adminUserController";
import {
  createMachineBox,
  createMachinePaper,
  deleteMachineBox,
  deleteMachinePaper,
  getMachineBoxes,
  getMachinePapers,
  updateMachineBox,
  updateMachinePaper,
} from "../../controller/admin/adminMachineController";
import {
  createWasteBox,
  createWastePaper,
  deleteWasteBox,
  deleteWastePaper,
  getWasteBoxes,
  getWastePapers,
  updateWasteBox,
  updateWastePaper,
} from "../../controller/admin/adminWasteNormController";
import {
  createWaveCrest,
  deleteWaveCrest,
  getWaveCrestCoefficient,
  updateWaveCrest,
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
router.get("/orders", authenticate, authorizeRole(["admin", "manager"]), getOrderPending);
router.put("/orders", authenticate, authorizeRole(["admin", "manager"]), updateStatusAdmin);

//===============================USERS=====================================
router.get("/users", authenticate, authorizeRole(["admin"]), getUsersAdmin);
router.put("/users", authenticate, authorizeRole(["admin"]), updateInfoUser);
router.delete("/users", authenticate, authorizeRole(["admin"]), deleteUser);

//===============================MACHINE PAPER=====================================
router.get("/machine-papers", authenticate, authorizeRole(["admin"]), getMachinePapers);
router.post("/machine-papers", authenticate, authorizeRole(["admin"]), createMachinePaper);
router.put("/machine-papers", authenticate, authorizeRole(["admin"]), updateMachinePaper);
router.delete("/machine-papers", authenticate, authorizeRole(["admin"]), deleteMachinePaper);

//===============================MACHINE BOX=====================================
router.get("/machine-boxes", authenticate, authorizeRole(["admin"]), getMachineBoxes);
router.post("/machine-boxes", authenticate, authorizeRole(["admin"]), createMachineBox);
router.put("/machine-boxes", authenticate, authorizeRole(["admin"]), updateMachineBox);
router.delete("/machine-boxes", authenticate, authorizeRole(["admin"]), deleteMachineBox);

//===============================WASTE NORM PAPER=====================================
router.get("/waste-norms/papers", authenticate, authorizeRole(["admin"]), getWastePapers);
router.post("/waste-norms/papers", authenticate, authorizeRole(["admin"]), createWastePaper);
router.put("/waste-norms/papers", authenticate, authorizeRole(["admin"]), updateWastePaper);
router.delete("/waste-norms/papers", authenticate, authorizeRole(["admin"]), deleteWastePaper);

//===============================WASTE NORM BOX=====================================
router.get("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), getWasteBoxes);
router.post("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), createWasteBox);
router.put("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), updateWasteBox);
router.delete("/waste-norms/boxes", authenticate, authorizeRole(["admin"]), deleteWasteBox);

//===============================WAVE CREST COEFFICIENT=====================================
router.get("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), getWaveCrestCoefficient);
router.post("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), createWaveCrest);
router.put("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), updateWaveCrest);
router.delete("/wave-crest-coeff", authenticate, authorizeRole(["admin"]), deleteWaveCrest);

//===============================CRITERIA=====================================
router.get("/criterias", authenticate, authorizeRole(["admin"]), getAllQcCriteria);
router.post("/criterias", authenticate, authorizeRole(["admin"]), createNewCriteria);
router.put("/criterias", authenticate, authorizeRole(["admin"]), updateCriteria);
router.delete("/criterias", authenticate, authorizeRole(["admin"]), deleteCriteria);

//===============================FLUTE RATIO=====================================
router.get("/flute-ratios", authenticate, authorizeRole(["admin"]), getAllFluteRatio);
router.post("/flute-ratios", authenticate, authorizeRole(["admin"]), createFluteRatio);
router.put("/flute-ratios", authenticate, authorizeRole(["admin"]), updateFluteRatio);
router.delete("/flute-ratios", authenticate, authorizeRole(["admin"]), deleteFluteRatio);

//===============================VEHICLE=====================================
router.get("/vehicles", authenticate, getAllVehicle);
router.post("/vehicles", authenticate, authorizeRole(["admin", "manager"]), createNewVehicle);
router.put("/vehicles", authenticate, authorizeRole(["admin", "manager"]), updateVehicle);
router.delete("/vehicles", authenticate, authorizeRole(["admin", "manager"]), deleteVehicle);

export default router;
