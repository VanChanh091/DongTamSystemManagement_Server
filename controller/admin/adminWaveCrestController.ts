import { Request, Response } from "express";
import {
  WaveCrestCoefficient,
  WaveCrestCreationAttributes,
} from "../../models/admin/waveCrestCoefficient";

//get all wave crest coefficient
export const getAllWaveCrestCoefficient = async (req: Request, res: Response) => {
  try {
    const data = await WaveCrestCoefficient.findAll();

    res.status(200).json({ message: "get all wave crest coefficient successfully", data });
  } catch (error: any) {
    console.error("failed to get all wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get wave crest by id
//use to get id for update
export const getWaveCrestById = async (req: Request, res: Response) => {
  const { waveCrestId } = req.query as { waveCrestId: string };
  const id = Number(waveCrestId);

  try {
    const waveCrest = await WaveCrestCoefficient.findByPk(id);
    if (!waveCrest) {
      return res.status(404).json({ message: "wave crest not found" });
    }

    return res.status(200).json({
      message: `get wave crest by waveCrestId:${id}`,
      data: waveCrest,
    });
  } catch (error: any) {
    console.error(`failed to get wave crest by waveCrestId:${id}`, error.message);
    res.status(500).json({ message: "server error" });
  }
};

//add wave crest coefficient
export const createWaveCrestCoefficient = async (req: Request, res: Response) => {
  const waveCrest = req.body as WaveCrestCreationAttributes;
  const transaction = await WaveCrestCoefficient.sequelize?.transaction();

  try {
    const newWaveCrest = await WaveCrestCoefficient.create(waveCrest, { transaction });

    await transaction?.commit();

    res.status(200).json({
      message: "create wave crest coefficient successfully",
      data: newWaveCrest,
    });
  } catch (error: any) {
    await transaction?.rollback();
    console.error("failed to create wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update wave crest coefficient
export const updateWaveCrestById = async (req: Request, res: Response) => {
  const { waveCrestId } = req.query as { waveCrestId: string };
  const { ...waveCrestUpdated } = req.body;

  const id = Number(waveCrestId);

  try {
    const existingWaveCrest = await WaveCrestCoefficient.findByPk(id);
    if (!existingWaveCrest) {
      return res.status(404).json({ message: "wave crest coefficient not found" });
    }

    await existingWaveCrest.update({
      ...waveCrestUpdated,
    });

    res.status(200).json({
      message: "update wave crest coefficient successfully",
      data: existingWaveCrest,
    });
  } catch (error: any) {
    console.error("failed to update wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete wave crest coefficient
export const deleteWaveCrestById = async (req: Request, res: Response) => {
  const { waveCrestId } = req.query as { waveCrestId: string };
  const id = Number(waveCrestId);

  try {
    const waveCrest = await WaveCrestCoefficient.findByPk(id);
    if (!waveCrest) {
      return res.status(404).json({ message: "wave crest coefficient not found" });
    }

    await waveCrest.destroy();

    res.status(200).json({
      message: `delete waveCrestCoefficientId:${id} successfully`,
    });
  } catch (error: any) {
    console.error("failed to delete wave crest coefficient", error.message);
    res.status(500).json({ message: "server error" });
  }
};
