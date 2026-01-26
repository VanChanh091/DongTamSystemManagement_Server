import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { EmployeeBasicInfo } from "./employeeBasicInfo";

//định nghĩa trường trong bảng
interface EmployeeCompanyInfoAttributes {
  companyInfoId: number;
  employeeCode: string;
  joinDate: Date;
  department: string;
  position: string;
  emergencyPhone?: string | null;
  emergencyContact?: string | null;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  employeeId: number;
}

//cho phép bỏ qua id khi tạo
export type EmployeeCompanyInfoCreationAttributes = Optional<
  EmployeeCompanyInfoAttributes,
  | "companyInfoId"
  | "employeeCode"
  | "emergencyPhone"
  | "emergencyContact"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class EmployeeCompanyInfo
  extends Model<EmployeeCompanyInfoAttributes, EmployeeCompanyInfoCreationAttributes>
  implements EmployeeCompanyInfoAttributes
{
  declare companyInfoId: number;
  declare employeeCode: string;
  declare joinDate: Date;
  declare department: string;
  declare position: string;
  declare emergencyPhone?: string | null;
  declare emergencyContact?: string | null;
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
      employeeCode: { type: DataTypes.STRING, allowNull: false },
      joinDate: { type: DataTypes.DATE, allowNull: false },
      department: { type: DataTypes.STRING, allowNull: false },
      position: { type: DataTypes.STRING, allowNull: false },
      emergencyPhone: { type: DataTypes.STRING },
      emergencyContact: { type: DataTypes.STRING },
      status: { type: DataTypes.STRING, allowNull: false },

      //FK
      employeeId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "EmployeeCompanyInfos", timestamps: true },
  );

  return EmployeeCompanyInfo;
}
