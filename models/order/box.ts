import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface BoxAttributes {
  boxId: number;
  inMatTruoc?: number | null;
  inMatSau?: number | null;
  chongTham?: boolean | null;
  canLan?: boolean | null;
  canMang?: boolean | null;
  Xa?: boolean | null;
  catKhe?: boolean | null;
  be?: boolean | null;
  maKhuon?: string | null;
  dan_1_Manh?: boolean | null;
  dan_2_Manh?: boolean | null;
  dongGhim1Manh?: boolean | null;
  dongGhim2Manh?: boolean | null;
  dongGoi?: string | null;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
}

//cho phép bỏ qua id khi tạo
export type BoxCreationAttributes = Optional<
  BoxAttributes,
  | "boxId"
  | "inMatTruoc"
  | "inMatSau"
  | "chongTham"
  | "canLan"
  | "canMang"
  | "Xa"
  | "catKhe"
  | "be"
  | "maKhuon"
  | "dan_1_Manh"
  | "dan_2_Manh"
  | "dongGhim1Manh"
  | "dongGhim2Manh"
  | "dongGoi"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Box extends Model<BoxAttributes, BoxCreationAttributes> implements BoxAttributes {
  declare boxId: number;
  declare inMatTruoc?: number | null;
  declare inMatSau?: number | null;
  declare chongTham?: boolean | null;
  declare canLan?: boolean | null;
  declare canMang?: boolean | null;
  declare Xa?: boolean | null;
  declare catKhe?: boolean | null;
  declare be?: boolean | null;
  declare maKhuon?: string | null;
  declare dan_1_Manh?: boolean | null;
  declare dan_2_Manh?: boolean | null;
  declare dongGhim1Manh?: boolean | null;
  declare dongGhim2Manh?: boolean | null;
  declare dongGoi?: string | null;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
}

export function initBoxModel(sequelize: Sequelize): typeof Box {
  Box.init(
    {
      boxId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      inMatTruoc: { type: DataTypes.INTEGER },
      inMatSau: { type: DataTypes.INTEGER },
      chongTham: { type: DataTypes.BOOLEAN },
      canLan: { type: DataTypes.BOOLEAN },
      canMang: { type: DataTypes.BOOLEAN },
      Xa: { type: DataTypes.BOOLEAN },
      catKhe: { type: DataTypes.BOOLEAN },
      be: { type: DataTypes.BOOLEAN },
      maKhuon: { type: DataTypes.STRING },
      dan_1_Manh: { type: DataTypes.BOOLEAN },
      dan_2_Manh: { type: DataTypes.BOOLEAN },
      dongGhim1Manh: { type: DataTypes.BOOLEAN },
      dongGhim2Manh: { type: DataTypes.BOOLEAN },
      dongGoi: { type: DataTypes.STRING },

      //FK
      orderId: { type: DataTypes.STRING },
    },
    {
      sequelize,
      tableName: "Boxes",
      timestamps: true,
      indexes: [{ unique: true, fields: ["orderId"] }],
    },
  );

  return Box;
}
