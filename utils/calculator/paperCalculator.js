import PaperFactor from "../../models/admin/paperFactor";

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

  return weight;
};

//totalConsumption
export const calculateTotalConsumption = (
  DmDay,
  DmSongC,
  DmSongB,
  DmSongE,
  DmDao
) => {
  const totalConsumption = DmDay + DmSongC + DmSongB + DmSongE + DmDao;
  return totalConsumption;
};

//DmDay
export const calculateDay = () => {};

//grammage layer
export const calculateDmSong = async (
  dvt,
  songE,
  matE,
  numberChild,
  sizePaper,
  weight,
  acreage,
  quantity,
  hsSong,
  layerType,
  paperType
) => {
  if (songE <= 0) return 0;

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
    ((songE * paper.coefficient) / 1000 + matE / 1000) *
    ((numberChild * sizePaper) / 100) *
    hsSong;

  return dvt === "kg"
    ? base * (quantity * paper.rollLossPercent)
    : base * (weight * acreage * paper.processLossPercent);
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
      layerType: layerType,
      paperType: paperType,
    },
  });

  if (!paper) {
    throw new Error(
      `Không tìm thấy hệ số cho layerType=${layerType} và paperType=${paperType}`
    );
  }

  if (dvt !== "kg" && dvt !== "cái") {
    let factor = 0;
    if (daoXa === "Tề Biên Đẹp") {
      factor = 1;
    } else if (daoXa === "Tề Biên Cột") {
      factor = 2;
    }
    const result =
      (factor * weight * sizePaper * numberChild) / 100 +
      weight * acreage * paper.processLossPercent;

    return result;
  } else {
    if (dvt === "quấn cuồn") {
      return 0;
    } else {
      return paper.rollLossPercent * quantity;
    }
  }
};
