import PaperFactor from "../../models/admin/paperFactor.js";

//weight
export const calculateWeight = (day, songE, songB, songC, matE, matB, matC) => {
  const weight =
    day / 1000 +
    (songE / 1000) * 1.3 +
    matE / 1000 +
    (songB / 1000) * 1.4 +
    matB / 1000 +
    (songC / 1000) * 1.45 +
    matC / 1000;

  return weight.toFixed(2);
}; //right

//totalConsumption
export const calculateTotalConsumption = (
  DmDay,
  DmSongC,
  DmSongB,
  DmSongE,
  DmDao
) => {
  const totalConsumption = DmDay + DmSongC + DmSongB + DmSongE + DmDao;
  return Number(totalConsumption.toFixed(2));
};

//DmDay
export const calculateDay = async (
  flute,
  dvt,
  quantity,
  weight,
  acreage,
  layerType,
  paperType
) => {
  const number = parseInt(flute, 10);
  if (number === 2) return 0;

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
      : weight * acreage * paper.processLossPercent;

  const result = value + extraValue;

  return Number(result.toFixed(2));
};

//grammage layer
export const calculateDmSong = async (
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
  paperType
) => {
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

  return dvt === "Kg"
    ? Number((base * (quantity * paper.rollLossPercent)).toFixed(2))
    : Number((base * (weight * acreage * paper.processLossPercent)).toFixed(2));
};

//DmMatE
export const calculateDao = async (
  dvt,
  daoXa,
  weight,
  sizePaper,
  numberChild,
  acreage,
  quantity,
  layerType,
  paperType
) => {
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

  if (dvt !== "Kg" && dvt !== "Cái") {
    let factor = 0;
    if (daoXa === "Tề Biên Đẹp") factor = 1;
    else if (daoXa === "Tề Biên Cột") factor = 2;

    const part1 = (factor * weight * numberChild * sizePaper) / 100;
    const part2 = weight * acreage * paper.processLossPercent;
    const result = part1 + part2;

    return Number(result.toFixed(2));
  } else {
    if (dvt === "Quấn Cuồn") {
      return 0;
    } else {
      return Number((paper.rollLossPercent * quantity).toFixed(2));
    }
  }
};
