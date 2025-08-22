import { DataTypes } from "sequelize";
import { sequelize } from "../../configs/connectDB.js";

const User = sequelize.define(
  "User",
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    sex: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    role: {
      type: DataTypes.ENUM("admin", "user", "manager"),
      defaultValue: "user",
    },
    permissions: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("permissions");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val) {
        this.setDataValue("permissions", JSON.stringify(val));
      },
      defaultValue: "[]", //sale, planning, hr, accounting, marketing, design, production,...
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue:
        "https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png",
    },
  },
  { timestamps: true }
);

export default User;
