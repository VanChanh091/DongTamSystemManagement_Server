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
const router = (0, express_1.Router)();
// Admin routes for managing orders
router.get("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminOrderController_1.getOrderPending);
router.put("/updateStatus", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin", "manager"]), adminOrderController_1.updateStatusAdmin);
//admin routes for machine paper
router.get("/getAllMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getAllMachinePaper);
router.get("/getMachinePaperById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getMachinePaperById);
router.post("/createMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.createMachinePaper);
router.put("/updateMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.updateMachinePaperById);
router.delete("/deleteMachinePaper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.deleteMachinePaperById);
//admin routes for machine box
router.get("/getAllMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getAllMachineBox);
router.get("/getMachineBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.getMachineBoxById);
router.post("/createMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.createMachineBox);
router.put("/updateMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.updateMachineBoxById);
router.delete("/deleteMachineBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminMachineController_1.deleteMachineBoxById);
// Admin routes for managing users
router.get("/getAllUsers", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getAllUsers);
router.get("/getUserByName", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUserByName);
router.get("/getUserByPhone", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUserByPhone);
router.get("/getUserByPermission", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.getUserByPermission);
router.put("/updateRole", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.updateUserRole);
router.put("/updatePermission", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.updatePermissions);
router.put("/resetPassword", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.resetPassword);
router.delete("/deleteUser", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminUserController_1.deleteUserById);
//admin routes for waste norm paper
router.get("/getAllWasteNorm", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getAllWasteNorm);
router.get("/getWasteNormById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getWasteNormById);
router.post("/createWasteNorm", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.createWasteNorm);
router.put("/updateWasteNormById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.updateWasteNormById);
router.delete("/deleteWasteNormById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.deleteWasteNormById);
//admin routes for waste norm box
router.get("/getAllWasteBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getAllWasteBox);
router.get("/getWasteBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.getWasteBoxById);
router.post("/createWasteBox", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.createWasteBox);
router.put("/updateWasteBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.updateWasteBoxById);
router.delete("/deleteWasteBoxById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWasteNormController_1.deleteWasteBoxById);
//admin routes for wave crest coefficient
router.get("/getAllWaveCrest", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.getAllWaveCrestCoefficient);
router.get("/getWaveCrestById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.getWaveCrestById);
router.post("/createWaveCrest", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.createWaveCrestCoefficient);
router.put("/updateWaveCrestById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.updateWaveCrestById);
router.delete("/deleteWaveCrestById", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeRole)(["admin"]), adminWaveCrestController_1.deleteWaveCrestById);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map