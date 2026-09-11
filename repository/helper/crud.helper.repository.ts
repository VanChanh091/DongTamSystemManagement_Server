import { Model, ModelStatic, Transaction, WhereOptions } from "sequelize";

export const CrudHelper = {
  findAll<T extends Model>({ model, options }: { model: ModelStatic<T>; options?: any }) {
    return model.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      ...options,
    });
  },

  findByPk<T extends Model>({
    model,
    id,
    options,
  }: {
    model: ModelStatic<T>;
    id: number;
    options?: any;
  }) {
    return model.findByPk(id, options);
  },

  findOne<T extends Model>({
    model,
    where,
    options,
  }: {
    model: ModelStatic<T>;
    where: WhereOptions<any>;
    options?: any;
  }) {
    return model.findOne({ where, ...options });
  },

  createData<T extends Model>({
    model,
    data,
    transaction,
  }: {
    model: ModelStatic<T>;
    data: any;
    transaction: Transaction;
  }) {
    return model.create(data, { transaction });
  },

  bulkCreate<T extends Model>({
    model,
    data,
    options,
  }: {
    model: ModelStatic<T>;
    data: any[];
    options: { updateOnDuplicate?: string[]; transaction: Transaction };
  }) {
    return model.bulkCreate(data, options);
  },

  updateData({
    model,
    data,
    options,
  }: {
    model: any;
    data: any;
    options: { where?: WhereOptions<any>; transaction: Transaction };
  }) {
    return model.update(data, options);
  },

  deleteData<T extends Model>({
    model,
    where,
    transaction,
  }: {
    model: ModelStatic<T>;
    where: WhereOptions<any>;
    transaction: Transaction;
  }) {
    return model.destroy({ where, transaction });
  },
};
