import Router from "express";
import {
  changePassword,
  login,
  register,
  verifyOTPChangePassword,
  getOtpCode,
} from "../controller/authController.js";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);
authRoutes.post("/getOtpCode", getOtpCode);
authRoutes.post("/verifyOTPChangePassword", verifyOTPChangePassword);
authRoutes.post("/changePassword", changePassword);

export default authRoutes;
