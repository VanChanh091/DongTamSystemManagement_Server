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
    dayStart: { type: DataTypes.DATE },
    timeRunning: { type: DataTypes.TIME },
    dayReplace: { type: DataTypes.STRING },
    matEReplace: { type: DataTypes.STRING },
    matBReplace: { type: DataTypes.STRING },
    matCReplace: { type: DataTypes.STRING },
    songEReplace: { type: DataTypes.STRING },
    songBReplace: { type: DataTypes.STRING },
    songCReplace: { type: DataTypes.STRING },
    songE2Replace: { type: DataTypes.STRING },
    lengthPaperPlanning: { type: DataTypes.DOUBLE, allowNull: false },
    sizePaperPLaning: { type: DataTypes.DOUBLE, allowNull: false },
    runningPlan: { type: DataTypes.INTEGER, allowNull: false },
    ghepKho: { type: DataTypes.INTEGER },
    bottom: { type: DataTypes.DOUBLE },
    fluteE: { type: DataTypes.DOUBLE },
    fluteB: { type: DataTypes.DOUBLE },
    fluteC: { type: DataTypes.DOUBLE },
    knife: { type: DataTypes.DOUBLE },
    totalLoss: { type: DataTypes.DOUBLE },
    chooseMachine: {
      type: DataTypes.ENUM(
        "Máy 1350",
        "Máy 1900",
        "Máy 2 Lớp",
        "Máy Quấn Cuồn"
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("planning", "waiting", "complete"),
      allowNull: false,
      defaultValue: "planning",
    },
    hasOverFlow: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    step: { type: DataTypes.ENUM("paper", "box"), allowNull: false },
    dependOnPlanningId: { type: DataTypes.INTEGER },
    sortPlanning: { type: DataTypes.INTEGER },
  },
  { timestamps: true }
);

export default Planning;
