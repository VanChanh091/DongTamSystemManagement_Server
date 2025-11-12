import {
  WasteNormPaper,
  WasteNormPaperCreationAttributes,
} from "../../models/admin/wasteNormPaper";
import { WasteNormBox, WasteNormBoxCreationAttributes } from "../../models/admin/wasteNormBox";
import { Request, Response } from "express";

//===============================WASTE PAPER=====================================

//get all
export const getAllWasteNorm = async (req: Request, res: Response) => {
  try {
    const data = await WasteNormPaper.findAll();

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error) {
    console.error("failed to get all waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};

//get waste norm by id
//use to get id for update
export const getWasteNormById = async (req: Request, res: Response) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const id = Number(wasteNormId);

  try {
    const wasteNorm = await WasteNormPaper.findByPk(id);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    return res.status(200).json({
      message: `get waste norm by wasteNormId:${id}`,
      data: wasteNorm,
    });
  } catch (error) {
    console.error(`failed to get  wasteNormId:${id}`, error);
    res.status(500).json({ message: "server error" });
  }
};

//add waste norm
export const createWasteNorm = async (req: Request, res: Response) => {
  const wasteNorm = req.body as WasteNormPaperCreationAttributes;
  const transaction = await WasteNormPaper.sequelize?.transaction();

  try {
    const newWasteNorm = await WasteNormPaper.create(wasteNorm, { transaction });

    await transaction?.commit();

    res.status(200).json({ message: "create machine successfully", data: newWasteNorm });
  } catch (error) {
    await transaction?.rollback();
    console.error("failed to create waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};

//update waste norm
export const updateWasteNormById = async (req: Request, res: Response) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const { ...wasteNormUpdated } = req.body;

  const id = Number(wasteNormId);

  try {
    const existingWasteNorm = await WasteNormPaper.findByPk(id);
    if (!existingWasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await existingWasteNorm.update({
      ...wasteNormUpdated,
    });

    res.status(200).json({
      message: "update waste norm successfully",
      data: existingWasteNorm,
    });
  } catch (error) {
    console.error("failed to update waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};

//delete waste norm
export const deleteWasteNormById = async (req: Request, res: Response) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const id = Number(wasteNormId);

  try {
    const wasteNorm = await WasteNormPaper.findByPk(id);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await wasteNorm.destroy();

    res.status(200).json({ message: `delete wasteNormId:${id} successfully` });
  } catch (error) {
    console.error("failed to delete waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};

//===============================WASTE BOX=====================================

export const getAllWasteBox = async (req: Request, res: Response) => {
  try {
    const data = await WasteNormBox.findAll();

    res.status(200).json({ message: "get all WasteNormBox successfully", data });
  } catch (error) {
    console.error("failed to get all waste norm box", error);
    res.status(500).json({ message: "server error" });
  }
};

//get waste norm by id
//use to get id for update
export const getWasteBoxById = async (req: Request, res: Response) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const id = Number(wasteNormId);

  try {
    const wasteNorm = await WasteNormBox.findByPk(id);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    return res.status(200).json({
      message: `get waste norm by wasteNormId:${id}`,
      data: wasteNorm,
    });
  } catch (error) {
    console.error(`failed to get waste norm by wasteNormId:${id}`, error);
    res.status(500).json({ message: "server error" });
  }
};

//add waste norm
export const createWasteBox = async (req: Request, res: Response) => {
  const wasteNorm = req.body as WasteNormBoxCreationAttributes;
  const transaction = await WasteNormBox.sequelize?.transaction();

  try {
    const newWasteNorm = await WasteNormBox.create(wasteNorm, { transaction });

    await transaction?.commit();

    res.status(200).json({
      message: "create WasteNormBox successfully",
      data: newWasteNorm,
    });
  } catch (error) {
    await transaction?.rollback();
    console.error("failed to create waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};

//update waste norm
export const updateWasteBoxById = async (req: Request, res: Response) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const { ...wasteNormUpdated } = req.body;

  const id = Number(wasteNormId);

  try {
    const existingWasteNorm = await WasteNormBox.findByPk(id);
    if (!existingWasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await existingWasteNorm.update({
      ...wasteNormUpdated,
    });

    res.status(200).json({
      message: "update waste norm successfully",
      data: existingWasteNorm,
    });
  } catch (error) {
    console.error("failed to update waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};

//delete waste norm
export const deleteWasteBoxById = async (req: Request, res: Response) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const id = Number(wasteNormId);

  try {
    const wasteNorm = await WasteNormBox.findByPk(id);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await wasteNorm.destroy();

    res.status(200).json({ message: `delete wasteNormId:${id} successfully` });
  } catch (error) {
    console.error("failed to delete waste norm", error);
    res.status(500).json({ message: "server error" });
  }
};
