"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const adminOrderController_1 = require("../../controller/admin/adminOrderController");
const adminUserController_1 = require("../../controller/admin/adminUserController");
const adminMachineController_1 = require("../../controller/admin/adminMachineController");
const adminWasteNormController_1 = require("../../controller/admin/adminWasteNormController");
const adminWaveCrestController_1 = require("../../controller/admin/adminWaveCrestController");
const adminCriteriaController_1 = require("../../controller/admin/adminCriteriaController");
const adminFluteRatioController_1 = require("../../controller/admin/adminFluteRatioController");
const adminVehicleController_1 = require("../../controller/admin/adminVehicleController");
const router = (0, express_1.Router)();
// Admin routes for managing orders
//===============================ORDERS=====================================
router.get("/orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminOrderController_1.getOrderPending);
router.put("/orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminOrderController_1.updateStatusAdmin);
//===============================USERS=====================================
router.get("/users", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUsersAdmin);
router.put("/users", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.updateInfoUser);
router.delete("/users", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.deleteUser);
//===============================MACHINE PAPER=====================================
router.get("/machine-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getMachinePapers);
router.post("/machine-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.createMachinePaper);
router.put("/machine-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.updateMachinePaper);
router.delete("/machine-papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.deleteMachinePaper);
//===============================MACHINE BOX=====================================
router.get("/machine-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getMachineBoxes);
router.post("/machine-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.createMachineBox);
router.put("/machine-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.updateMachineBox);
router.delete("/machine-boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.deleteMachineBox);
//===============================WASTE NORM PAPER=====================================
router.get("/waste-norms/papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getWastePapers);
router.post("/waste-norms/papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.createWastePaper);
router.put("/waste-norms/papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.updateWastePaper);
router.delete("/waste-norms/papers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.deleteWastePaper);
//===============================WASTE NORM BOX=====================================
router.get("/waste-norms/boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getWasteBoxes);
router.post("/waste-norms/boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.createWasteBox);
router.put("/waste-norms/boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.updateWasteBox);
router.delete("/waste-norms/boxes", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.deleteWasteBox);
//===============================WAVE CREST COEFFICIENT=====================================
router.get("/wave-crest-coeff", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.getWaveCrestCoefficient);
router.post("/wave-crest-coeff", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.createWaveCrest);
router.put("/wave-crest-coeff", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.updateWaveCrest);
router.delete("/wave-crest-coeff", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.deleteWaveCrest);
//===============================CRITERIA=====================================
router.get("/criterias", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), adminCriteriaController_1.getAllQcCriteria);
router.post("/criterias", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.createNewCriteria);
router.put("/criterias", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.updateCriteria);
router.delete("/criterias", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.deleteCriteria);
//===============================FLUTE RATIO=====================================
router.get("/flute-ratios", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.getAllFluteRatio);
router.post("/flute-ratios", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.createFluteRatio);
router.put("/flute-ratios", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.updateFluteRatio);
router.delete("/flute-ratios", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.deleteFluteRatio);
//===============================VEHICLE=====================================
router.get("/vehicles", authMiddleware_1.default, adminVehicleController_1.getAllVehicle);
router.post("/vehicles", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminVehicleController_1.createNewVehicle);
router.put("/vehicles", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminVehicleController_1.updateVehicle);
router.delete("/vehicles", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminVehicleController_1.deleteVehicle);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map