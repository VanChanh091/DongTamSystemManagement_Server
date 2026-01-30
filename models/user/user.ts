import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type userRole = "admin" | "user" | "manager";

interface UserAttributes {
  userId: number;
  fullName: string;
  email: string;
  password: string;
  sex?: string | null;
  phone?: string | null;
  role: userRole;
  permissions: string[];
  avatar?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// cho phép bỏ qua các fiel này khi tạo
export type UserCreationAttributes = Optional<
  UserAttributes,
  "userId" | "permissions" | "avatar" | "role" | "sex" | "phone" | "createdAt" | "updatedAt"
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare userId: number;
  declare fullName: string;
  declare email: string;
  declare password: string;
  declare sex?: string | null;
  declare phone?: string | null;
  declare role: userRole;
  declare permissions: string[];
  declare avatar?: string | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sex: {
        type: DataTypes.STRING,
      },
      phone: {
        type: DataTypes.STRING,
      },
      role: {
        type: DataTypes.ENUM("admin", "user", "manager"),
        defaultValue: "user",
      },
      permissions: {
        type: DataTypes.TEXT,
        get() {
          const rawValue = this.getDataValue("permissions") as unknown as string;
          return rawValue ? (JSON.parse(rawValue) as string[]) : [];
        },
        set(val: string[]) {
          this.setDataValue("permissions", JSON.stringify(val) as any);
        },
        defaultValue: "[]",
      },

      avatar: {
        type: DataTypes.STRING,
        defaultValue:
          "https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png",
      },
    },
    {
      sequelize,
      tableName: "Users",
      timestamps: true,
      indexes: [{ fields: ["fullName"] }],
    },
  );

  return User;
}
