"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const product_1 = require("../models/product/product");
exports.productRepository = {
    //get all
    findAllProduct: async () => {
        return await product_1.Product.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    },
    findProductByPk: async (producId, transaction) => {
        return await product_1.Product.findByPk(producId, {
            attributes: { exclude: ["createdAt", "updatedAt"] },
            transaction,
        });
    },
    findProductByPage: async ({ page, pageSize, whereCondition = {}, }) => {
        const query = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            order: [["productSeq", "ASC"]],
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await product_1.Product.findAndCountAll(query);
    },
    //create
    createProduct: async (data, transaction) => {
        return await product_1.Product.create(data, { transaction });
    },
    //update
    updateProduct: async (product, productData, transaction) => {
        return await product.update(productData, { transaction });
    },
};
//# sourceMappingURL=productRepository.js.map