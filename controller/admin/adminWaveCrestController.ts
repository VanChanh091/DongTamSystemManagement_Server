import { NextFunction, Request, Response } from "express";
import { WaveCrestCreationAttributes } from "../../models/admin/waveCrestCoefficient";
import { adminMachineService } from "../../service/admin/adminMachineService";

//get all wave crest coefficient
export const getAllWaveCrestCoefficient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await adminMachineService.getAllWaveCrestCoefficient();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get wave crest by id
//use to get id for update
export const getWaveCrestById = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminMachineService.getWaveCrestById(Number(waveCrestId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add wave crest coefficient
export const createWaveCrestCoefficient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const waveCrest = req.body as WaveCrestCreationAttributes;

  try {
    const response = await adminMachineService.createWaveCrestCoefficient(waveCrest);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update wave crest coefficient
export const updateWaveCrestById = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };
  const { ...waveCrestUpdated } = req.body;

  try {
    const response = await adminMachineService.updateWaveCrestById(
      Number(waveCrestId),
      waveCrestUpdated
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete wave crest coefficient
export const deleteWaveCrestById = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminMachineService.deleteWaveCrestById(Number(waveCrestId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
