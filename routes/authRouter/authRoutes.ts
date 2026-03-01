import Router from "express";
import {
  changePassword,
  getOtpCode,
  login,
  register,
  verifyOTPChangePassword,
} from "../../controller/auth/authController";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);
authRoutes.post("/get-otp-code", getOtpCode);
authRoutes.post("/verify-otp-change-password", verifyOTPChangePassword);
authRoutes.post("/change-password", changePassword);

export default authRoutes;
