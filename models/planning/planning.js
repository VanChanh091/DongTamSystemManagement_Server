import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const Planning = sequelize.define(
  "Planning",
  {
    planningId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    runningPlan: { type: DataTypes.INTEGER, allowNull: false },
    timeRunning: { type: DataTypes.TIME, allowNull: false },
    dayReplace: { type: DataTypes.STRING },
    middle_1Replace: { type: DataTypes.STRING },
    middle_2Replace: { type: DataTypes.STRING },
    matReplace: { type: DataTypes.STRING },
    songEReplace: { type: DataTypes.STRING },
    songBReplace: { type: DataTypes.STRING },
    songCReplace: { type: DataTypes.STRING },
    songE2Replace: { type: DataTypes.STRING },
    lengthPaperPlanning: { type: DataTypes.DOUBLE, allowNull: false },
    sizePaperPLaning: { type: DataTypes.DOUBLE, allowNull: false },
    numberChild: { type: DataTypes.INTEGER, allowNull: false },
    ghepKho: { type: DataTypes.INTEGER },
    chooseMachine: {
      type: DataTypes.ENUM("Máy 1350", "Máy 1900", "Máy 2 Lớp"),
      allowNull: false,
    },
    sortPlanning: { type: DataTypes.INTEGER },
  },
  { timestamps: true }
);

export default Planning;
