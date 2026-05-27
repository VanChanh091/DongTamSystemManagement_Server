import { FindOptions, Transaction } from "sequelize";
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

  buildProductOptions: ({
    page,
    pageSize,
    whereCondition = {},
    isExport = false,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    isExport?: boolean;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;

      queryOptions.order = [["productSeq", "ASC"]];
    }

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
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
