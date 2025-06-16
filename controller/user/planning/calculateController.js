import PaperFactor from "../../../models/admin/paperFactor.js";

//weight
export const calculateWeight = (req, res) => {
  const { day, songE, songB, songC, matE, matB, matC } = req.body;
  try {
    const weight =
      day / 1000 +
      (songE / 1000) * 1.3 +
      matE / 1000 +
      (songB / 1000) * 1.4 +
      matB / 1000 +
      (songC / 1000) * 1.45 +
      matC / 1000;

    const result = weight.toFixed(3);

    res.status(200).json(result);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
}; //right

//DmDay
export const calculateDay = async (req, res) => {
  const { flute, dvt, quantity, weight, acreage, layerType, paperType } =
    req.body;
  try {
    const number = parseInt(flute, 10);
    if (number === 2) {
      return res.status(200).json("0");
    }

    const paper = await PaperFactor.findOne({
      where: {
        layerType: layerType,
        paperType: paperType,
      },
    });
    if (!paper) {
      throw new Error(
        `Không tìm thấy hệ số cho layerType=${layerType} và paperType=${paperType}`
      );
    }

    let value = 0;
    if (number >= 3) {
      value = paper.coefficient;
    }

    const extraValue =
      dvt === "Kg"
        ? quantity * paper.processLossPercent
        : weight * acreage * (paper.processLossPercent / 100);

    const result = value + extraValue;

    res.status(200).json(result.toFixed(2));
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
}; //right

//grammage layer
export const calculateDmSong = async (req, res) => {
  const {
    dvt,
    song,
    mat,
    numberChild,
    sizePaper,
    weight,
    acreage,
    quantity,
    hsSong,
    layerType,
    paperType,
  } = req.body;
  try {
    if (song <= 0) return 0;

    const paper = await PaperFactor.findOne({
      where: {
        layerType: layerType,
        paperType: paperType,
      },
    });

    if (!paper) {
      throw new Error(
        `Không tìm thấy hệ số cho layerType=${layerType} và paperType=${paperType}`
      );
    }

    const base =
      ((song * hsSong) / 1000 + mat / 1000) *
      ((numberChild * sizePaper) / 100) *
      paper.coefficient;

    const result =
      dvt === "Kg"
        ? Number((base * (quantity * paper.rollLossPercent)).toFixed(2))
        : Number(
            (base * (weight * acreage * paper.processLossPercent)).toFixed(2)
          );

    res.status(200).json(result.toFixed(2));
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

//DmMatE
export const calculateDao = async (req, res) => {
  const {
    dvt,
    daoXa,
    weight,
    sizePaper,
    numberChild,
    acreage,
    quantity,
    layerType,
    paperType,
  } = req.body;
  try {
    const paper = await PaperFactor.findOne({
      where: {
        layerType,
        paperType,
      },
    });

    if (!paper) {
      throw new Error(
        `Không tìm thấy hệ số cho layerType=${layerType} và paperType=${paperType}`
      );
    }

    let result = 0;
    if (dvt !== "Kg" && dvt !== "Cái") {
      let factor = 0;
      if (daoXa === "Tề Biên Đẹp") factor = 1;
      else if (daoXa === "Tề Biên Cột") factor = 2;

      const part1 = (factor * weight * numberChild * sizePaper) / 100;
      const part2 = weight * acreage * (paper.processLossPercent / 100);
      result = part1 + part2;
    } else {
      if (dvt === "Quấn Cuồn") {
        return 0;
      } else {
        result = Number(((paper.rollLossPercent / 100) * quantity).toFixed(2));
      }
    }

    res.status(200).json(result.toFixed(2));
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
}; //right

//totalConsumption
export const calculateTotalConsumption = (req, res) => {
  const { DmDay, DmSongC, DmSongB, DmSongE, DmDao } = req.body;
  try {
    const totalConsumption = DmDay + DmSongC + DmSongB + DmSongE + DmDao;
    return Number(totalConsumption.toFixed(2));

    res.status(200).json(result);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};
