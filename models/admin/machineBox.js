import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const MachineBox = sequelize.define("MachineBox", {
  machineId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  timeToProduct: { type: DataTypes.INTEGER, allowNull: false },
  speedOfMachine: { type: DataTypes.INTEGER, allowNull: false },
  machineName: { type: DataTypes.STRING, allowNull: false },
});

export default MachineBox;
