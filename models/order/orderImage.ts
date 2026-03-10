import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface OrderImageAttributes {
  imageId: number;
  imageUrl: string;
  publicId: string;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
}

//cho phép bỏ qua các field khi tạo
export type OrderImageCreationAttributes = Optional<
  OrderImageAttributes,
  "imageId" | "imageUrl" | "publicId" | "createdAt" | "updatedAt" | "orderId"
>;

export class OrderImage
  extends Model<OrderImageAttributes, OrderImageCreationAttributes>
  implements OrderImageAttributes
{
  declare imageId: number;
  declare imageUrl: string;
  declare publicId: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
}

export function initOrderImageModel(sequelize: Sequelize): typeof OrderImage {
  OrderImage.init(
    {
      imageId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      publicId: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "OrderImages",
      timestamps: true,
      indexes: [{ fields: ["orderId"] }],
    },
  );

  return OrderImage;
}
