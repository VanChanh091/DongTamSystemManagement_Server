import { Op, Sequelize } from "sequelize";
import { Product } from "../models/product/product";

export const productRepository = {
  //get all
  productCount: async () => {
    return await Product.count();
  },

  findAllProduct: async () => {
    return await Product.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },

  findProductByPk: async (producId: string) => {
    return await Product.findByPk(producId);
  },

  findProductByPage: async (page: number, pageSize: number) => {
    return await Product.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [["productSeq", "ASC"]],
    });
  },

  //create
  checkPrefixProduct: async (sanitizedPrefix: string, transaction?: any) => {
    return await Product.findOne({
      where: {
        productId: {
          [Op.like]: `${sanitizedPrefix}%`,
        },
      },
      transaction,
    });
  },

  findAllById: async (transaction?: any) => {
    return await Product.findAll({
      attributes: ["productId"],
      transaction,
    });
  },

  createProduct: async (data: any, transaction?: any) => {
    return await Product.create(data, { transaction });
  },

  //update
  updateProduct: async (product: any, productData: any, transaction?: any) => {
    return await product.update(productData, { transaction });
  },

  //export
  exportExcelProducts: async (whereCondition: any = {}) => {
    return await Product.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [
        //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
      ],
    });
  },
};
