import { Request, Response } from "express";
import { authService } from "../../service/authService";

export const getOtpCode = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const response = await authService.getOtpCode(email);
    res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const response = await authService.register(req.body);
    res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const response = await authService.login(email, password);

    res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const verifyOTPChangePassword = async (req: Request, res: Response) => {
  const { email, otpInput } = req.body;

  try {
    const response = await authService.verifyOTPChangePassword(email, otpInput);
    res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { email, newPassword, confirmNewPW } = req.body;

  try {
    const response = await authService.changePassword(email, newPassword, confirmNewPW);
    res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
