import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Customer } from "../customer/customer";
import { User } from "../user/user";

export type DebtDeductionRequestStatus = "pending" | "approved" | "rejected";

//định nghĩa trường trong bảng
interface DebtDeductionRequestAttributes {
  requestId: number;
  amountRequested: number;
  paymentMethod: string;
  requestedBy: string;
  approvedBy?: string | null;
  rejectReason?: string | null;
  isUrgent: boolean;
  status: DebtDeductionRequestStatus;

  //FK
  customerId: string;
  userId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DebtDeductionRequestCreationAttributes = Optional<
  DebtDeductionRequestAttributes,
  "requestId" | "status" | "approvedBy" | "rejectReason" | "isUrgent" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DebtDeductionRequest
  extends Model<DebtDeductionRequestAttributes, DebtDeductionRequestCreationAttributes>
  implements DebtDeductionRequestAttributes
{
  declare requestId: number;
  declare amountRequested: number;
  declare paymentMethod: string;
  declare requestedBy: string;
  declare approvedBy?: string | null;
  declare rejectReason?: string | null;
  declare isUrgent: boolean;
  declare status: DebtDeductionRequestStatus;

  //FK
  declare customerId: string;
  declare Customer: Customer;

  declare userId: number;
  declare User: User;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initdebtDeductionRequestModel(sequelize: Sequelize): typeof DebtDeductionRequest {
  DebtDeductionRequest.init(
    {
      requestId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      amountRequested: { type: DataTypes.DOUBLE, allowNull: false },
      paymentMethod: { type: DataTypes.STRING, allowNull: false },
      requestedBy: { type: DataTypes.STRING, allowNull: false },
      approvedBy: { type: DataTypes.STRING },
      rejectReason: { type: DataTypes.STRING },
      isUrgent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "đánh dấu yêu cầu khẩn cấp duyệt qua OTP",
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },

      //FK
      customerId: { type: DataTypes.STRING, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "debt_deduction_request",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["customerId"] },
        { fields: ["userId"] },

        //index
        { fields: ["status"] },
      ],
    },
  );

  return DebtDeductionRequest;
}
