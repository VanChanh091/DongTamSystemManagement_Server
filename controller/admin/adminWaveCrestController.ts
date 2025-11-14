import { Request, Response } from "express";
import { WaveCrestCreationAttributes } from "../../models/admin/waveCrestCoefficient";
import { adminService } from "../../service/adminService";

//get all wave crest coefficient
export const getAllWaveCrestCoefficient = async (req: Request, res: Response) => {
  try {
    const response = await adminService.getAllWaveCrestCoefficient();
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get wave crest by id
//use to get id for update
export const getWaveCrestById = async (req: Request, res: Response) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.getWaveCrestById(Number(waveCrestId));
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//add wave crest coefficient
export const createWaveCrestCoefficient = async (req: Request, res: Response) => {
  const waveCrest = req.body as WaveCrestCreationAttributes;

  try {
    const response = await adminService.createWaveCrestCoefficient(waveCrest);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//update wave crest coefficient
export const updateWaveCrestById = async (req: Request, res: Response) => {
  const { waveCrestId } = req.query as { waveCrestId: string };
  const { ...waveCrestUpdated } = req.body;

  try {
    const response = await adminService.updateWaveCrestById(Number(waveCrestId), waveCrestUpdated);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//delete wave crest coefficient
export const deleteWaveCrestById = async (req: Request, res: Response) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.deleteWaveCrestById(Number(waveCrestId));
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
