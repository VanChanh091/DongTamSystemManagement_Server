import { NextFunction, Request, Response } from "express";
import { userService } from "../../../service/userService";

export const updateProfileUser = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query as { userId: string };
  const { newPassword, userUpdated } = req.body;

  try {
    const response = await userService.updateProfile({
      req,
      userId: Number(userId),
      newPassword,
      userUpdated,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
