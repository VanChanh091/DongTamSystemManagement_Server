"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../../controller/auth/authController");
const authRoutes = (0, express_1.default)();
authRoutes.post("/login", authController_1.login);
authRoutes.post("/register", authController_1.register);
authRoutes.post("/getOtpCode", authController_1.getOtpCode);
authRoutes.post("/verifyOTPChangePassword", authController_1.verifyOTPChangePassword);
authRoutes.post("/changePassword", authController_1.changePassword);
exports.default = authRoutes;
//# sourceMappingURL=authRoutes.js.map