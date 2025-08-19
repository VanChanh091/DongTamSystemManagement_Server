import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Box = sequelize.define(
  "Box",
  {
    boxId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inMatTruoc: { type: DataTypes.INTEGER },
    inMatSau: { type: DataTypes.INTEGER },
    chongTham: { type: DataTypes.BOOLEAN },
    canLan: { type: DataTypes.BOOLEAN },
    canMang: { type: DataTypes.BOOLEAN },
    Xa: { type: DataTypes.BOOLEAN },
    catKhe: { type: DataTypes.BOOLEAN },
    be: { type: DataTypes.BOOLEAN },
    maKhuon: { type: DataTypes.STRING },
    dan_1_Manh: { type: DataTypes.BOOLEAN },
    dan_2_Manh: { type: DataTypes.BOOLEAN },
    dongGhim1Manh: { type: DataTypes.BOOLEAN },
    dongGhim2Manh: { type: DataTypes.BOOLEAN },
    dongGoi: { type: DataTypes.STRING },
  },
  { timestamps: true }
);

export default Box;
