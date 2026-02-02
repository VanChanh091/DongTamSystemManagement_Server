"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelProduct = exports.deleteProduct = exports.updateProduct = exports.addProduct = exports.getProductByField = exports.getAllProduct = void 0;
const productService_1 = require("../../../service/productService");
//get all product
const getAllProduct = async (req, res, next) => {
    const { page = 1, pageSize = 20, noPaging = false, } = req.query;
    try {
        const response = await productService_1.productService.getAllProducts({
            page: Number(page),
            pageSize: Number(pageSize),
            noPaging,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllProduct = getAllProduct;
//get product by fied
const getProductByField = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await productService_1.productService.getProductByField({
            field,
            keyword,
            page: Number(page),
            pageSize: Number(pageSize),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getProductByField = getProductByField;
//add product
const addProduct = async (req, res, next) => {
    try {
        const response = await productService_1.productService.createProduct(req, req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addProduct = addProduct;
//update product
const updateProduct = async (req, res, next) => {
    const { id } = req.query;
    const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    try {
        const response = await productService_1.productService.updatedProduct(req, id, productData);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
//delete product
const deleteProduct = async (req, res, next) => {
    const { id } = req.params;
    try {
        const response = await productService_1.productService.deletedProduct(id, req.user.role);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
//export excel
const exportExcelProduct = async (req, res, next) => {
    const { typeProduct, all = false } = req.body;
    try {
        await productService_1.productService.exportExcelProducts(res, { typeProduct, all });
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelProduct = exportExcelProduct;
//# sourceMappingURL=productController.js.map