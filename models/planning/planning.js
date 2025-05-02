import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB";

const Planning = sequelize.define("Planning", {
  planningId: {
    type: DataTypes.STRING,
  },
});

export default Planning;
