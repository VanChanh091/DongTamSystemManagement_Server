import { NextFunction, Request, Response } from "express";
import { authService } from "../../service/authService";

export const getOtpCode = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  try {
    const response = await authService.getOtpCode(email);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await authService.register(req.body);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const response = await authService.login(email, password);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const verifyOTPChangePassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email, otpInput } = req.body;

  try {
    const response = await authService.verifyOTPChangePassword(email, otpInput);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email, newPassword, confirmNewPW } = req.body;

  try {
    const response = await authService.changePassword(email, newPassword, confirmNewPW);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
