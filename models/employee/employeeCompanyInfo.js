import { sequelize } from "../../configs/connectDB.js";
import { DataTypes } from "sequelize";

const EmployeeCompanyInfo = sequelize.define("EmployeeCompanyInfo", {
  companyInfoId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeCode: { type: DataTypes.STRING },
  joinDate: { type: DataTypes.DATE, allowNull: false },
  department: { type: DataTypes.STRING, allowNull: false },
  position: { type: DataTypes.STRING, allowNull: false },
  emergencyPhone: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
});

export default EmployeeCompanyInfo;
