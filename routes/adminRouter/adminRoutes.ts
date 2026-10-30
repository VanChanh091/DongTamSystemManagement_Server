import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  authorizeAccess,
  authorizeAnyPermission,
  authorizeRole,
} from "../../middlewares/permissionMiddleware";
import {
  createMachineBox,
  createMachinePaper,
  deleteMachineBox,
  deleteMachinePaper,
  getMachineBoxes,
  getMachinePapers,
  getRawMachinePapers,
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
  createNewVehicle,
  deleteVehicle,
  getAllVehicle,
  updateVehicle,
  createNewCriteriaCheck,
  deleteCriteriaCheck,
  getAllCriteriaCheck,
  updateCriteriaCheck,
  createFluteRatio,
  deleteFluteRatio,
  getAllFluteRatio,
  updateFluteRatio,
  createWaveCrest,
  deleteWaveCrest,
  getWaveCrestCoefficient,
  updateWaveCrest,
  createNewCriteria,
  deleteCriteria,
  getAllQcCriteria,
  updateCriteria,
  getOrderPending,
  updateStatusAdmin,
  deleteUser,
  updateInfoUser,
  requestOtpCode,
  getUsersExcludeAdmin,
} from "../../controller/admin/adminController";
import {
  createBasisWeight,
  createPaperClassification,
  createPaperType,
  createSupplier,
  createSupplierPaperCode,
  getAllBasisWeights,
  getAllPaperClassifications,
  getAllPaperTypes,
  getAllSupplierPaperCodes,
  getAllSuppliers,
  handleUpdateSupplier,
  updateBasisWeight,
  updatePaperClassification,
  updatePaperType,
  updateSupplierPaperCode,
} from "../../controller/admin/adminPaperCodeController";
const router = Router();

const authorizeAdmin = () => authorizeAccess({});
const authorizeManagerSale = () => authorizeAccess({ departments: ["Sale"], requireDept: true });

// Admin routes for managing orders authorizeAdmin(),
//===============================ORDERS=====================================
router.get("/orders", authenticate, authorizeManagerSale(), getOrderPending);
router.post("/orders/send-otp", authenticate, authorizeManagerSale(), requestOtpCode);
router.put("/orders", authenticate, authorizeManagerSale(), updateStatusAdmin);

//===============================USERS=====================================
router.get("/users", authenticate, authorizeAdmin(), getUsersExcludeAdmin);
router.put("/users", authenticate, authorizeAdmin(), updateInfoUser);
router.delete("/users", authenticate, authorizeAdmin(), deleteUser);

//===============================MACHINE PAPER=====================================

router.get("/machine-papers", authenticate, authorizeAdmin(), getMachinePapers);
router.post("/machine-papers", authenticate, authorizeAdmin(), createMachinePaper);
router.put("/machine-papers", authenticate, authorizeAdmin(), updateMachinePaper);
router.delete("/machine-papers", authenticate, authorizeAdmin(), deleteMachinePaper);

//using to get machine for FE
router.get("/machine-papers/machine-name", authenticate, getRawMachinePapers);

//===============================MACHINE BOX=====================================
router.get("/machine-boxes", authenticate, authorizeAdmin(), getMachineBoxes);
router.post("/machine-boxes", authenticate, authorizeAdmin(), createMachineBox);
router.put("/machine-boxes", authenticate, authorizeAdmin(), updateMachineBox);
router.delete("/machine-boxes", authenticate, authorizeAdmin(), deleteMachineBox);

//===============================WASTE NORM PAPER=====================================
router.get("/waste-norms/papers", authenticate, authorizeAdmin(), getWastePapers);
router.post("/waste-norms/papers", authenticate, authorizeAdmin(), createWastePaper);
router.put("/waste-norms/papers", authenticate, authorizeAdmin(), updateWastePaper);
router.delete("/waste-norms/papers", authenticate, authorizeAdmin(), deleteWastePaper);

//===============================WASTE NORM BOX=====================================
router.get("/waste-norms/boxes", authenticate, authorizeAdmin(), getWasteBoxes);
router.post("/waste-norms/boxes", authenticate, authorizeAdmin(), createWasteBox);
router.put("/waste-norms/boxes", authenticate, authorizeAdmin(), updateWasteBox);
router.delete("/waste-norms/boxes", authenticate, authorizeAdmin(), deleteWasteBox);

//===============================WAVE CREST COEFFICIENT=====================================
router.get("/wave-crest-coeff", authenticate, authorizeAdmin(), getWaveCrestCoefficient);
router.post("/wave-crest-coeff", authenticate, authorizeAdmin(), createWaveCrest);
router.put("/wave-crest-coeff", authenticate, authorizeAdmin(), updateWaveCrest);
router.delete("/wave-crest-coeff", authenticate, authorizeAdmin(), deleteWaveCrest);

//===============================CRITERIA=====================================
router.get(
  "/criterias",
  authenticate,
  authorizeAccess({ departments: ["QC"], permissions: ["QC"], requireDept: true }),
  getAllQcCriteria,
);
router.post("/criterias", authenticate, authorizeAdmin(), createNewCriteria);
router.put("/criterias", authenticate, authorizeAdmin(), updateCriteria);
router.delete("/criterias", authenticate, authorizeAdmin(), deleteCriteria);

//===============================CRITERIA CHECK=====================================
router.get("/criteria-check", authenticate, getAllCriteriaCheck);
router.post("/criteria-check", authenticate, authorizeAdmin(), createNewCriteriaCheck);
router.put("/criteria-check", authenticate, authorizeAdmin(), updateCriteriaCheck);
router.delete("/criteria-check", authenticate, authorizeAdmin(), deleteCriteriaCheck);

//===============================FLUTE RATIO=====================================
router.get("/flute-ratios", authenticate, authorizeAdmin(), getAllFluteRatio);
router.post("/flute-ratios", authenticate, authorizeAdmin(), createFluteRatio);
router.put("/flute-ratios", authenticate, authorizeAdmin(), updateFluteRatio);
router.delete("/flute-ratios", authenticate, authorizeAdmin(), deleteFluteRatio);

//===============================VEHICLE=====================================
router.get("/vehicles", authenticate, getAllVehicle);
router.post("/vehicles", authenticate, authorizeAdmin(), createNewVehicle);
router.put("/vehicles", authenticate, authorizeAdmin(), updateVehicle);
router.delete("/vehicles", authenticate, authorizeAdmin(), deleteVehicle);

// =========================== SUPPLIERS =================================
router.get("/suppliers", authenticate, getAllSuppliers);
router.post("/suppliers", authenticate, authorizeAdmin(), createSupplier);
router.put("/suppliers", authenticate, authorizeAdmin(), handleUpdateSupplier);

// ========================== PAPER TYPES ================================
router.get("/paper-types", authenticate, getAllPaperTypes);
router.post("/paper-types", authenticate, authorizeAdmin(), createPaperType);
router.put("/paper-types", authenticate, authorizeAdmin(), updatePaperType);

// ====================== PAPER BASIS WEIGHTS ============================
router.get("/paper-basis-weights", authenticate, getAllBasisWeights);
router.post("/paper-basis-weights", authenticate, authorizeAdmin(), createBasisWeight);
router.put("/paper-basis-weights", authenticate, authorizeAdmin(), updateBasisWeight);

// ====================== SUPPLIER PAPER CODES ===========================
router.get("/supplier-paper-codes", authenticate, authorizeAdmin(), getAllSupplierPaperCodes);
router.post("/supplier-paper-codes", authenticate, authorizeAdmin(), createSupplierPaperCode);
router.put("/supplier-paper-codes", authenticate, authorizeAdmin(), updateSupplierPaperCode);

// ====================== PAPER CLASSIFICATIONS ==========================
router.get("/paper-classifications", authenticate, authorizeAdmin(), getAllPaperClassifications);
router.post("/paper-classifications", authenticate, authorizeAdmin(), createPaperClassification);
router.put("/paper-classifications", authenticate, authorizeAdmin(), updatePaperClassification);

export default router;
