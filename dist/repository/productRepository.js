"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const sequelize_1 = require("sequelize");
const product_1 = require("../models/product/product");
exports.productRepository = {
    //get all
    productCount: async () => {
        return await product_1.Product.count();
    },
    findAllProduct: async () => {
        return await product_1.Product.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    },
    findProductByPk: async (producId) => {
        return await product_1.Product.findByPk(producId);
    },
    findProductByPage: async (page, pageSize) => {
        return await product_1.Product.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            offset: (page - 1) * pageSize,
            limit: pageSize,
            order: [
                //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
            ],
        });
    },
    //create
    checkPrefixProduct: async (sanitizedPrefix, transaction) => {
        return await product_1.Product.findOne({
            where: {
                productId: {
                    [sequelize_1.Op.like]: `${sanitizedPrefix}%`,
                },
            },
            transaction,
        });
    },
    findAllById: async (transaction) => {
        return await product_1.Product.findAll({
            attributes: ["productId"],
            transaction,
        });
    },
    createProduct: async (data, transaction) => {
        return await product_1.Product.create(data, { transaction });
    },
    //update
    updateProduct: async (product, productData, transaction) => {
        return await product.update(productData, { transaction });
    },
    //export
    exportExcelProducts: async (whereCondition = {}) => {
        return await product_1.Product.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            order: [
                //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
            ],
        });
    },
};
//# sourceMappingURL=productRepository.js.map