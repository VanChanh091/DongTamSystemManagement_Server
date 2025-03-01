import Router from "express";
import {
  changePassword,
  login,
  register,
  verifyOTP,
  handleSendEmail,
} from "../controller/authController.js";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);
authRoutes.post("/handleSendEmail", handleSendEmail);
authRoutes.post("/verifyOTP", verifyOTP);
authRoutes.post("/changePassword", changePassword);

export default authRoutes;
