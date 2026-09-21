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
    buildProductOptions: ({ page, pageSize, whereCondition = {}, isExport = false, }) => {
        const queryOptions = {
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
    createProduct: async (data, transaction) => {
        return await product_1.Product.create(data, { transaction });
    },
    //update
    updateProduct: async (product, productData, transaction) => {
        return await product.update(productData, { transaction });
    },
};
//# sourceMappingURL=productRepository.js.map