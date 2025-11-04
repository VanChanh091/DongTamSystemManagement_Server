import WasteNormPaper from "../../models/admin/wasteNormPaper.js";
import WasteNormBox from "../../models/admin/wasteNormBox.js";

//===============================WASTE PAPER=====================================

//get all
export const getAllWasteNorm = async (req, res) => {
  try {
    const data = await WasteNormPaper.findAll();

    res.status(200).json({ message: "get all machine successfully", data });
  } catch (error) {
    console.error("failed to get all waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get waste norm by id
//use to get id for update
export const getWasteNormById = async (req, res) => {
  const { wasteNormId } = req.query;

  try {
    const wasteNorm = await WasteNormPaper.findByPk(wasteNormId);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    return res.status(200).json({
      message: `get waste norm by wasteNormId:${wasteNormId}`,
      data: wasteNorm,
    });
  } catch (error) {
    console.error(`failed to get  wasteNormId:${wasteNormId}`, error.message);
    res.status(500).json({ message: "server error" });
  }
};

//add waste norm
export const createWasteNorm = async (req, res) => {
  const { ...wasteNorm } = req.body;

  const transaction = await WasteNormPaper.sequelize.transaction();
  try {
    const newWasteNorm = await WasteNormPaper.create({ ...wasteNorm }, { transaction });

    await transaction.commit();

    res.status(200).json({ message: "create machine successfully", data: newWasteNorm });
  } catch (error) {
    await transaction.rollback();
    console.error("failed to create waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update waste norm
export const updateWasteNormById = async (req, res) => {
  const { wasteNormId } = req.query;
  const { ...wasteNormUpdated } = req.body;

  try {
    const existingWasteNorm = await WasteNormPaper.findByPk(wasteNormId);
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
    console.error("failed to update waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete waste norm
export const deleteWasteNormById = async (req, res) => {
  const { wasteNormId } = req.query;

  try {
    const wasteNorm = await WasteNormPaper.findByPk(wasteNormId);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await wasteNorm.destroy();

    res.status(200).json({ message: `delete wasteNormId:${wasteNormId} successfully` });
  } catch (error) {
    console.error("failed to delete waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//===============================WASTE BOX=====================================

export const getAllWasteBox = async (req, res) => {
  try {
    const data = await WasteNormBox.findAll();

    res.status(200).json({ message: "get all WasteNormBox successfully", data });
  } catch (error) {
    console.error("failed to get all waste norm box", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//get waste norm by id
//use to get id for update
export const getWasteBoxById = async (req, res) => {
  const { wasteNormId } = req.query;
  try {
    const wasteNorm = await WasteNormBox.findByPk(wasteNormId);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    return res.status(200).json({
      message: `get waste norm by wasteNormId:${wasteNormId}`,
      data: wasteNorm,
    });
  } catch (error) {
    console.error(`failed to get waste norm by wasteNormId:${wasteNormId}`, error.message);
    res.status(500).json({ message: "server error" });
  }
};

//add waste norm
export const createWasteBox = async (req, res) => {
  const { ...wasteNorm } = req.body;

  const transaction = await WasteNormBox.sequelize.transaction();
  try {
    const newWasteNorm = await WasteNormBox.create({ ...wasteNorm }, { transaction });

    await transaction.commit();

    res.status(200).json({
      message: "create WasteNormBox successfully",
      data: newWasteNorm,
    });
  } catch (error) {
    console.error("failed to create waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//update waste norm
export const updateWasteBoxById = async (req, res) => {
  const { wasteNormId } = req.query;
  const { ...wasteNormUpdated } = req.body;
  try {
    const existingWasteNorm = await WasteNormBox.findByPk(wasteNormId);
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
    console.error("failed to update waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};

//delete waste norm
export const deleteWasteBoxById = async (req, res) => {
  const { wasteNormId } = req.query;

  try {
    const wasteNorm = await WasteNormBox.findByPk(wasteNormId);
    if (!wasteNorm) {
      return res.status(404).json({ message: "waste norm not found" });
    }

    await wasteNorm.destroy();

    res.status(200).json({ message: `delete wasteNormId:${wasteNormId} successfully` });
  } catch (error) {
    console.error("failed to delete waste norm", error.message);
    res.status(500).json({ message: "server error" });
  }
};
