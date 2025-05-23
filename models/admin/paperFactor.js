import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const PaperFactor = sequelize.define("PaperFactor", {
  paperFactorId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  layerType: { type: DataTypes.ENUM("3_LAYER", "4_5_LAYER", "MORE_5_LAYER") },
  paperType: {
    type: DataTypes.ENUM("BOTTOM", "SONG_E", "SONG_B", "SONG_C", "DAO"),
  },
  rollLossPercent: { type: DataTypes.DOUBLE },
  processLossPercent: { type: DataTypes.DOUBLE },
  coefficient: { type: DataTypes.INTEGER },
});

export default PaperFactor;
