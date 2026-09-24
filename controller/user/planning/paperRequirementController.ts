import { NextFunction, Request, Response } from "express";
import { paperRequirementService } from "../../../service/planning/paperRequirementService";

export const getPaperRequirements = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, requirementId, field, keyword } = req.query as {
    machine?: string;
    requirementId?: string;
    field?: string;
    keyword?: string;
  };

  try {
    let response;

    if (requirementId) {
      response = await paperRequirementService.getLayersByRequirementId(Number(requirementId));
    } else if (machine) {
      if (field && keyword) {
        response = await paperRequirementService.getPaperRequirementByField({
          machine,
          field,
          keyword,
        });
      } else {
        response = await paperRequirementService.getPaperRequirementsList({
          machine,
        });
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
