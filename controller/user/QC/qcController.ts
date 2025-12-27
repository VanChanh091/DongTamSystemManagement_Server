import { NextFunction, Request, Response } from "express";
import { qcSessionService } from "../../../service/qualityControl/qcSessionService";
import { processTypeQC } from "../../../models/qualityControl/qcCriteria";
import { statusQcSession } from "../../../models/qualityControl/qcSession";
import { qcSampleService } from "../../../service/qualityControl/qcSampleService";
import { qcChecklistData } from "../../../models/qualityControl/qcSampleResult";
import { qcSubmitService } from "../../../service/qualityControl/orchestratorService";

//===============================QC SESSION=================================

//get all qc session
export const getAllQcSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await qcSessionService.getAllQcSession();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getSessionByFk = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, planningBoxId } = req.query as {
    planningId?: string;
    planningBoxId?: string;
  };

  try {
    const response = await qcSessionService.getSessionByFk({
      planningId: planningId ? Number(planningId) : undefined,
      planningBoxId: planningBoxId ? Number(planningBoxId) : undefined,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create new qc session
export const createNewSession = async (req: Request, res: Response, next: NextFunction) => {
  const { processType, planningId, planningBoxId, totalSample } = req.body as {
    processType: processTypeQC;
    planningId?: number;
    planningBoxId?: number;
    totalSample?: number;
  };

  try {
    const response = await qcSessionService.createNewSession({
      processType,
      planningId,
      planningBoxId,
      totalSample,
      user: req.user,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update qc session
export const updateSession = async (req: Request, res: Response, next: NextFunction) => {
  const { qcSessionId, status, totalSample } = req.body as {
    qcSessionId: number;
    status?: statusQcSession;
    totalSample?: number;
  };

  try {
    const response = await qcSessionService.updateSession({
      qcSessionId,
      status,
      totalSample,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================QC SAMPLE=================================

//get all qc result
export const getAllQcResult = async (req: Request, res: Response, next: NextFunction) => {
  const { qcSessionId } = req.query as { qcSessionId: string };

  try {
    const response = await qcSampleService.getAllQcResult(Number(qcSessionId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create new qc result
export const createNewResult = async (req: Request, res: Response, next: NextFunction) => {
  const { qcSessionId, samples } = req.body as {
    qcSessionId: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
  };

  try {
    const response = await qcSampleService.createNewResult({ qcSessionId, samples });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update qc result
export const updateResult = async (req: Request, res: Response, next: NextFunction) => {
  const { qcSessionId, samples } = req.body as {
    qcSessionId: number;
    samples: Array<{
      sampleIndex: number;
      checklist: qcChecklistData;
    }>;
  };

  try {
    const response = await qcSampleService.updateResult({ qcSessionId, samples });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// confirm Finalize Session
export const confirmFinalizeSession = async (req: Request, res: Response, next: NextFunction) => {
  const {
    planningId,
    planningBoxId,
    isPaper = true,
  } = req.body as {
    planningId?: number;
    planningBoxId?: number;
    isPaper: boolean;
  };

  try {
    const response = await qcSampleService.confirmFinalizeSession({
      planningId,
      planningBoxId,
      isPaper,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================QC RESULT=================================

export const submitQC = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await qcSubmitService.submitQC({
      ...req.body,
      user: req.user,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
