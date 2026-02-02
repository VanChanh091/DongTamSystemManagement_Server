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
router.get("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminOrderController_1.getOrderPending);
router.put("/updateStatus", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminOrderController_1.updateStatusAdmin);
//admin routes for machine paper
//===============================MACHINE PAPER=====================================
router.get("/getAllMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getAllMachinePaper);
router.get("/getMachinePaperById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getMachinePaperById);
router.post("/createMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.createMachinePaper);
router.put("/updateMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.updateMachinePaperById);
router.delete("/deleteMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.deleteMachinePaperById);
//===============================MACHINE BOX=====================================
router.get("/getAllMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getAllMachineBox);
router.get("/getMachineBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getMachineBoxById);
router.post("/createMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.createMachineBox);
router.put("/updateMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.updateMachineBoxById);
router.delete("/deleteMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.deleteMachineBoxById);
//===============================USERS=====================================
router.get("/getAllUsers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getAllUsers);
router.get("/getUserByName", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUserByName);
router.get("/getUserByPhone", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUserByPhone);
router.get("/getUserByPermission", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUserByPermission);
router.put("/updateRole", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.updateUserRole);
router.put("/updatePermission", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.updatePermissions);
router.put("/resetPassword", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.resetPassword);
router.delete("/deleteUser", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.deleteUserById);
//===============================WASTE NORM PAPER=====================================
router.get("/getAllWasteNorm", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getAllWasteNorm);
router.get("/getWasteNormById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getWasteNormById);
router.post("/createWasteNorm", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.createWasteNorm);
router.put("/updateWasteNormById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.updateWasteNormById);
router.delete("/deleteWasteNormById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.deleteWasteNormById);
//===============================WASTE NORM BOX=====================================
router.get("/getAllWasteBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getAllWasteBox);
router.get("/getWasteBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getWasteBoxById);
router.post("/createWasteBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.createWasteBox);
router.put("/updateWasteBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.updateWasteBoxById);
router.delete("/deleteWasteBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.deleteWasteBoxById);
//===============================WAVE CREST COEFFICIENT=====================================
router.get("/getAllWaveCrest", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.getAllWaveCrestCoefficient);
router.get("/getWaveCrestById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.getWaveCrestById);
router.post("/createWaveCrest", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.createWaveCrestCoefficient);
router.put("/updateWaveCrestById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.updateWaveCrestById);
router.delete("/deleteWaveCrestById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.deleteWaveCrestById);
//===============================CRITERIA=====================================
router.get("/getCriteria", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.getAllQcCriteria);
router.post("/newCriteria", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.createNewCriteria);
router.put("/updateCriteria", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.updateCriteria);
router.delete("/deleteCriteria", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminCriteriaController_1.deleteCriteria);
//===============================FLUTE RATIO=====================================
router.get("/getFluteRatio", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.getAllFluteRatio);
router.post("/createFluteRatio", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.createFluteRatio);
router.put("/updateFluteRatio", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.updateFluteRatio);
router.delete("/deleteFluteRatio", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminFluteRatioController_1.deleteFluteRatio);
//===============================VEHICLE=====================================
router.get("/getAllVehicle", authMiddleware_1.default, adminVehicleController_1.getAllVehicle);
router.post("/newVehicle", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminVehicleController_1.createNewVehicle);
router.put("/updateVehicle", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminVehicleController_1.updateVehicle);
router.delete("/deleteVehicle", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminVehicleController_1.deleteVehicle);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map