import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const InfoProduction = sequelize.define(
  "InfoProduction",
  {
    infoProductionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    dayReplace: { type: DataTypes.STRING },
    middle_1Replace: { type: DataTypes.STRING },
    middle_2Replace: { type: DataTypes.STRING },
    matReplace: { type: DataTypes.STRING },
    songE_Replace: { type: DataTypes.STRING },
    songB_Replace: { type: DataTypes.STRING },
    songC_Replace: { type: DataTypes.STRING },
    songE2_Replace: { type: DataTypes.STRING },
    sizePaper: { type: DataTypes.DOUBLE, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    numberChild: { type: DataTypes.INTEGER, allowNull: false },
    canLan: { type: DataTypes.STRING },
    daoXa: { type: DataTypes.STRING, allowNull: false },
  },
  { timestamps: true }
);

export default InfoProduction;
