"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
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
            order: [["productSeq", "ASC"]],
        });
    },
    //create
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
            order: [["productSeq", "ASC"]],
        });
    },
};
//# sourceMappingURL=productRepository.js.map