import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { EmployeeBasicInfo } from "./employeeBasicInfo";

//định nghĩa trường trong bảng
interface EmployeeCompanyInfoAttributes {
  companyInfoId: number;
  employeeCode?: string | null;
  joinDate: Date;
  department: string;
  position: string;
  emergencyPhone: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  employeeId: number;
}

//cho phép bỏ qua id khi tạo
type EmployeeCompanyInfoCreationAttributes = Optional<
  EmployeeCompanyInfoAttributes,
  "companyInfoId" | "employeeCode" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class EmployeeCompanyInfo
  extends Model<EmployeeCompanyInfoAttributes, EmployeeCompanyInfoCreationAttributes>
  implements EmployeeCompanyInfoAttributes
{
  declare companyInfoId: number;
  declare employeeCode?: string | null;
  declare joinDate: Date;
  declare department: string;
  declare position: string;
  declare emergencyPhone: string;
  declare status: string;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare employeeId: number;
  declare basicInfo: EmployeeBasicInfo;
}

export function initEmployeeCompanyInfoModel(sequelize: Sequelize): typeof EmployeeCompanyInfo {
  EmployeeCompanyInfo.init(
    {
      companyInfoId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employeeCode: { type: DataTypes.STRING },
      joinDate: { type: DataTypes.DATE, allowNull: false },
      department: { type: DataTypes.STRING, allowNull: false },
      position: { type: DataTypes.STRING, allowNull: false },
      emergencyPhone: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },

      //FK
      employeeId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "EmployeeCompanyInfos", timestamps: true }
  );

  return EmployeeCompanyInfo;
}
