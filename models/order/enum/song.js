import { DataTypes } from "sequelize";
import { sequelize } from "../../../configs/connectDB.js";

const Song = sequelize.define("Song", {
  songId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  loaiSong: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Song.associations = (model) => {
  Song.hasOne(model.Order, { foreignKey: "songId" });
};

export default Song;
