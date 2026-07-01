import { NextFunction, Request, Response } from "express";
import { adminCriteriaCheckService } from "../../service/admin/adminCriteriaCheckService";

//get all criteria check
export const getAllCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper, machine } = req.query as { isPaper: string; machine?: string };

  try {
    const response = await adminCriteriaCheckService.getAllCriteriaCheck(isPaper, machine);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create new criteria check
export const createNewCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper } = req.query as { isPaper: string };

  try {
    const response = await adminCriteriaCheckService.createNewCriteriaCheck(req.body, isPaper);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update criteria check
export const updateCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { criteriaId, isPaper } = req.query as { criteriaId: string; isPaper: string };

  try {
    const response = await adminCriteriaCheckService.updateCriteriaCheck(
      Number(criteriaId),
      req.body,
      isPaper,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete criteria check
export const deleteCriteriaCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { criteriaId, isPaper } = req.query as { criteriaId: string; isPaper: string };

  try {
    const response = await adminCriteriaCheckService.deleteCriteriaCheck(
      Number(criteriaId),
      isPaper,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
