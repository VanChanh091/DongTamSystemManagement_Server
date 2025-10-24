import { sequelize } from "../../configs/connectDB.js";
import { DataTypes } from "sequelize";

const EmployeeBasicInfo = sequelize.define("EmployeeBasicInfo", {
  employeeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  gender: { type: DataTypes.ENUM("Nam", "Nữ", "Khác"), allowNull: false },
  birthday: { type: DataTypes.DATE, allowNull: false },
  birthPlace: { type: DataTypes.STRING, allowNull: false },
  homeTown: { type: DataTypes.STRING },
  educationLevel: { type: DataTypes.STRING, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  educationSystem: { type: DataTypes.STRING },
  major: { type: DataTypes.STRING },
  citizenId: { type: DataTypes.STRING, allowNull: false },
  citizenIssuedDate: { type: DataTypes.DATE, allowNull: false },
  citizenIssuedPlace: { type: DataTypes.STRING, allowNull: false },
  permanentAddress: { type: DataTypes.STRING, allowNull: false },
  temporaryAddress: { type: DataTypes.STRING, allowNull: false },
  ethnicity: { type: DataTypes.STRING, allowNull: false }, //dân tộc
});

export default EmployeeBasicInfo;
