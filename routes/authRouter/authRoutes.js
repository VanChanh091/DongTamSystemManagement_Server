import Router from "express";
import {
  changePassword,
  getOtpCode,
  login,
  register,
  verifyOTPChangePassword,
} from "../../controller/auth/authController.js";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);
authRoutes.post("/getOtpCode", getOtpCode);
authRoutes.post("/verifyOTPChangePassword", verifyOTPChangePassword);
authRoutes.post("/changePassword", changePassword);

export default authRoutes;
