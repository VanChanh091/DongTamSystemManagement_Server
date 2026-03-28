import { Transaction } from "sequelize";
import { Product } from "../models/product/product";

export const productRepository = {
  //get all
  findAllProduct: async () => {
    return await Product.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },

  findProductByPk: async (producId: string, transaction: Transaction) => {
    return await Product.findByPk(producId, {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      transaction,
    });
  },

  findProductByPage: async ({
    page,
    pageSize,
    whereCondition = {},
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
  }) => {
    const query: any = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [["productSeq", "ASC"]],
    };

    if (page && pageSize) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await Product.findAndCountAll(query);
  },

  //create
  createProduct: async (data: any, transaction?: Transaction) => {
    return await Product.create(data, { transaction });
  },

  //update
  updateProduct: async (product: any, productData: any, transaction?: Transaction) => {
    return await product.update(productData, { transaction });
  },
};
