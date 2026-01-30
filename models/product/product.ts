import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface ProductAttributes {
  productId: string;
  typeProduct: string;
  productName?: string | null;
  maKhuon?: string | null;
  productImage?: string | null;
  productSeq: number;
  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type ProductCreationAttributes = Optional<
  ProductAttributes,
  "productName" | "maKhuon" | "productImage" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  declare productId: string;
  declare typeProduct: string;
  declare productName?: string | null;
  declare maKhuon?: string | null;
  declare productImage?: string | null;
  declare productSeq: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initProductModel(sequelize: Sequelize): typeof Product {
  Product.init(
    {
      productId: {
        type: DataTypes.STRING(14),
        allowNull: false,
        primaryKey: true,
      },
      typeProduct: { type: DataTypes.STRING, allowNull: false },
      productName: { type: DataTypes.STRING },
      maKhuon: { type: DataTypes.STRING },
      productImage: { type: DataTypes.STRING },
      productSeq: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "Products",
      timestamps: true,
      indexes: [{ fields: ["productSeq"] }],
    },
  );

  return Product;
}
