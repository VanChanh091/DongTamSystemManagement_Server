import { NextFunction, Request, Response } from "express";
import { paperRequirementService } from "../../../service/planning/paperRequirementService";

export const getPaperRequirements = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, requirementId } = req.query as { machine?: string; requirementId?: string };

  try {
    let response;

    if (requirementId) {
      response = await paperRequirementService.getLayersByRequirementId(Number(requirementId));
    } else if (machine) {
      response = await paperRequirementService.getPaperRequirementsList({
        machine,
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
