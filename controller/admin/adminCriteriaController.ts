import { NextFunction, Request, Response } from "express";
import { processTypeQC, QcCriteriaAttributes } from "../../models/qualityControl/qcCriteria";
import { adminCriteriaService } from "../../service/admin/adminCriteriaService";

//get all qc criteria
export const getAllQcCriteria = async (req: Request, res: Response, next: NextFunction) => {
  const { type } = req.query as { type: processTypeQC };

  try {
    const response = await adminCriteriaService.getAllQcCriteria(type);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create new qc criteria
export const createNewCriteria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminCriteriaService.createNewCriteria(req.body as QcCriteriaAttributes);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update qc criteria
export const updateCriteria = async (req: Request, res: Response, next: NextFunction) => {
  const { qcCriteriaId } = req.query as { qcCriteriaId: string };

  try {
    const response = await adminCriteriaService.updateCriteria(
      Number(qcCriteriaId),
      req.body as QcCriteriaAttributes
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete qc criteria
export const deleteCriteria = async (req: Request, res: Response, next: NextFunction) => {
  const { qcCriteriaId } = req.query as { qcCriteriaId: string };

  try {
    const response = await adminCriteriaService.deleteCriteria(Number(qcCriteriaId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
