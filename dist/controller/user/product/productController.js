"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelProduct = exports.deleteProduct = exports.updateProduct = exports.addProduct = exports.getProductByField = exports.getAllProduct = void 0;
const productService_1 = require("../../../service/productService");
//get all product
const getAllProduct = async (req, res) => {
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
        res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getAllProduct = getAllProduct;
//get product by fied
const getProductByField = async (req, res) => {
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
        res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getProductByField = getProductByField;
//add product
const addProduct = async (req, res) => {
    try {
        const response = await productService_1.productService.createProduct(req, req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        res.status(error.statusCode).json({ message: error.message });
    }
};
exports.addProduct = addProduct;
//update product
const updateProduct = async (req, res) => {
    const { id } = req.query;
    const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    try {
        const response = await productService_1.productService.updatedProduct(req, id, productData);
        return res.status(200).json(response);
    }
    catch (error) {
        res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateProduct = updateProduct;
//delete product
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const response = await productService_1.productService.deletedProduct(id);
        return res.status(200).json(response);
    }
    catch (error) {
        res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteProduct = deleteProduct;
//export excel
const exportExcelProduct = async (req, res) => {
    const { typeProduct, all = false } = req.body;
    try {
        await productService_1.productService.exportExcelProducts(res, { typeProduct, all });
    }
    catch (error) {
        res.status(error.statusCode).json({ message: error.message });
    }
};
exports.exportExcelProduct = exportExcelProduct;
//# sourceMappingURL=productController.js.map