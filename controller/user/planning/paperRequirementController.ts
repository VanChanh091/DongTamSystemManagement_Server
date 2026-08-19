import { NextFunction, Request, Response } from "express";
import { paperRequirementService } from "../../../service/planning/paperRequirementService";

export const getPaperRequirements = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, machine, requirementId } = req.query as {
    page?: string;
    pageSize?: string;
    machine?: string;
    requirementId?: string;
  };

  try {
    let response;

    if (requirementId) {
      response = await paperRequirementService.getLayersByRequirementId(Number(requirementId));
    } else if (machine) {
      response = await paperRequirementService.getPaperRequirementsList({
        page: Number(page),
        pageSize: Number(pageSize),
        machine,
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
