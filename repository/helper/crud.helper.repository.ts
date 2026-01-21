import { Model, ModelStatic, Transaction, Op, WhereOptions } from "sequelize";

export const CrudHelper = {
  findByPk<T extends Model>({
    model,
    id,
    options = {},
  }: {
    model: ModelStatic<T>;
    id: number;
    options?: any;
  }) {
    return model.findByPk(id, options);
  },

  findOne<T extends Model>({
    model,
    whereCondition,
    options = {},
  }: {
    model: ModelStatic<T>;
    whereCondition: WhereOptions<any>;
    options?: any;
  }) {
    return model.findOne({
      where: whereCondition,
      ...options,
    });
  },

  findAll<T extends Model>({
    model,
    whereCondition,
    options = {},
  }: {
    model: ModelStatic<T>;
    whereCondition: WhereOptions<any>;
    options?: any;
  }) {
    return model.findAll({
      where: whereCondition,
      ...options,
    });
  },

  create<T extends Model>({
    model,
    data,
    transaction,
  }: {
    model: ModelStatic<T>;
    data: any;
    transaction?: Transaction;
  }) {
    return model.create(data, { transaction });
  },

  bulkCreate<T extends Model>({
    model,
    data,
    options = {},
  }: {
    model: ModelStatic<T>;
    data: any[];
    options: {
      updateOnDuplicate?: string[];
      transaction?: Transaction;
    };
  }) {
    return model.bulkCreate(data, options);
  },

  updateByIds<T extends Model>({
    model,
    whereCondition,
    data,
    transaction,
  }: {
    model: ModelStatic<T>;
    whereCondition: WhereOptions<any>;
    data: any;
    transaction?: Transaction;
  }) {
    return model.update(data, {
      where: whereCondition,
      transaction,
    });
  },

  deleteByIds<T extends Model>({
    model,
    whereCondition,
    transaction,
  }: {
    model: ModelStatic<T>;
    whereCondition: WhereOptions<any>;
    transaction?: Transaction;
  }) {
    return model.destroy({
      where: whereCondition,
      transaction,
    });
  },
};
