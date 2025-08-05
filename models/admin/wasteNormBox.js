import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const WasteNormBox = sequelize.define("WasteNormBox", {
  wasteBoxId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  colorNumberOnProduct: { type: DataTypes.INTEGER },
  paperNumberOnProduct: { type: DataTypes.INTEGER },
  totalLossOnTotalQty: { type: DataTypes.DOUBLE, allowNull: false },
  machineName: { type: DataTypes.STRING, allowNull: false },
});

export default WasteNormBox;
