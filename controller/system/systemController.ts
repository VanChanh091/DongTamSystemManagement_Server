import { NextFunction, Request, Response } from "express";
import { cleanAllForeignKeys } from "../../service/system/clearFkService";

export const cleanAllForeignKeysDb = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await cleanAllForeignKeys();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
