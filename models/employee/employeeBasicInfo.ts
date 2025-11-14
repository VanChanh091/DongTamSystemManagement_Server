import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { EmployeeCompanyInfo } from "./employeeCompanyInfo";

//định nghĩa trường trong bảng
interface EmployeeBasicInfoAttributes {
  employeeId: number;
  fullName: string;
  gender: "Nam" | "Nữ" | "Khác";
  birthday: Date;
  birthPlace: string;
  homeTown?: string | null;
  educationLevel: string;
  phoneNumber: string;
  educationSystem?: string | null;
  major?: string | null;
  citizenId: string;
  citizenIssuedDate: Date;
  citizenIssuedPlace: string;
  permanentAddress: string;
  temporaryAddress: string;
  ethnicity: string;
  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type EmployeeBasicInfoCreationAttributes = Optional<
  EmployeeBasicInfoAttributes,
  "employeeId" | "homeTown" | "educationSystem" | "major" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class EmployeeBasicInfo
  extends Model<EmployeeBasicInfoAttributes, EmployeeBasicInfoCreationAttributes>
  implements EmployeeBasicInfoAttributes
{
  declare employeeId: number;
  declare fullName: string;
  declare gender: "Nam" | "Nữ" | "Khác";
  declare birthday: Date;
  declare birthPlace: string;
  declare homeTown?: string | null;
  declare educationLevel: string;
  declare phoneNumber: string;
  declare educationSystem?: string | null;
  declare major?: string | null;
  declare citizenId: string;
  declare citizenIssuedDate: Date;
  declare citizenIssuedPlace: string;
  declare permanentAddress: string;
  declare temporaryAddress: string;
  declare ethnicity: string;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare companyInfo: EmployeeCompanyInfo;
}

export function initEmployeeBasicInfoModel(sequelize: Sequelize): typeof EmployeeBasicInfo {
  EmployeeBasicInfo.init(
    {
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
    },
    { sequelize, tableName: "EmployeeBasicInfos", timestamps: true }
  );

  return EmployeeBasicInfo;
}
