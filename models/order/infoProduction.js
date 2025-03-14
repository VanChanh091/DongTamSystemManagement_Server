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
    structureReplace: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sizePaper: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    instructSpecial: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numberChild: {
      type: DataTypes.ENUM(1, 2, 3, 4, 5),
      allowNull: false,
    },
    te_Bien: {
      type: DataTypes.ENUM(
        "Cấn lằn",
        "Tề biên",
        "Quấn cuộn",
        "Tề biên cột",
        "Tề gọn",
        "Tề đẹp"
      ),
      allowNull: false,
    },
    nextStep: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: true }
);

InfoProduction.associations = (model) => {
  InfoProduction.hasOne(model.Order, { foreignKey: "infoProductionId" });
};

export default InfoProduction;
