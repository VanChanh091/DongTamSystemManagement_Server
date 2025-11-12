"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelProduct = exports.deleteProduct = exports.updateProduct = exports.addProduct = exports.getProductByField = exports.getAllProduct = void 0;
const product_1 = require("../../../models/product/product");
const connectCloudinary_1 = __importDefault(require("../../../configs/connectCloudinary"));
const sequelize_1 = require("sequelize");
const generateNextId_1 = require("../../../utils/helper/generateNextId");
const converToWebp_1 = require("../../../utils/image/converToWebp");
const excelExporter_1 = require("../../../utils/helper/excelExporter");
const orderHelpers_1 = require("../../../utils/helper/modelHelper/orderHelpers");
const productRowAndColumn_1 = require("../../../utils/mapping/productRowAndColumn");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//get all product
const getAllProduct = async (req, res) => {
    const { page = 1, pageSize = 20, noPaging = false } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const noPagingMode = noPaging === "true";
    const { product } = cacheManager_1.CacheManager.keys;
    const cacheKey = noPaging === "true" ? product.all : product.page(currentPage);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check(product_1.Product, "product");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearProduct();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data Product from Redis");
                const parsed = JSON.parse(cachedData);
                return res.status(200).json({ ...parsed, message: "Get all products from cache" });
            }
        }
        let data, totalPages;
        const totalProducts = await product_1.Product.count();
        if (noPagingMode) {
            totalPages = 1;
            data = await product_1.Product.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
            });
        }
        else {
            totalPages = Math.ceil(totalProducts / currentPageSize);
            data = await product_1.Product.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
                offset: (currentPage - 1) * currentPageSize,
                limit: currentPageSize,
                order: [
                    //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                    [sequelize_1.Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
                ],
            });
        }
        const responseData = {
            message: "get all products successfully",
            data,
            totalProducts,
            totalPages,
            currentPage: noPagingMode ? 1 : currentPage,
        };
        await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("get all product failed:", error.message);
        res.status(500).json({ message: "get all product failed" });
    }
};
exports.getAllProduct = getAllProduct;
//get product by fied
const getProductByField = async (req, res) => {
    const { field, keyword, page, pageSize } = req.query;
    const fieldMap = {
        productId: (product) => product.productId,
        productName: (product) => product?.productName,
    };
    const key = field;
    if (!fieldMap[key]) {
        return res.status(400).json({ message: "Invalid field parameter" });
    }
    const { product } = cacheManager_1.CacheManager.keys;
    try {
        const result = await (0, orderHelpers_1.filterDataFromCache)({
            model: product_1.Product,
            cacheKey: product.search,
            keyword: keyword,
            getFieldValue: fieldMap[key],
            page,
            pageSize,
            message: `get all by ${field} from filtered cache`,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error(`Failed to get product by ${field}:`, error.message);
        return res.status(500).json({ message: "Server error", error: error });
    }
};
exports.getProductByField = getProductByField;
//add product
const addProduct = async (req, res) => {
    const { prefix = "CUSTOM", product } = req.body;
    const parsedProduct = typeof product === "string" ? JSON.parse(product) : product;
    const transaction = await product_1.Product.sequelize?.transaction();
    try {
        const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
        // 🔍 Check prefix đã tồn tại chưa
        const prefixExists = await product_1.Product.findOne({
            where: {
                productId: {
                    [sequelize_1.Op.like]: `${sanitizedPrefix}%`,
                },
            },
            transaction,
        });
        if (prefixExists) {
            await transaction?.rollback();
            return res.status(400).json({
                message: `Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`,
            });
        }
        const products = await product_1.Product.findAll({
            attributes: ["productId"],
            transaction,
        });
        //custom productId
        const allProductIds = products.map((p) => p.productId);
        const newProductId = (0, generateNextId_1.generateNextId)(allProductIds, sanitizedPrefix, 4);
        if (req.file) {
            const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
            const result = await (0, converToWebp_1.uploadImageToCloudinary)(webpBuffer, "products", newProductId.replace(/\s+/g, "_"));
            parsedProduct.productImage = result.secure_url;
        }
        const newProduct = await product_1.Product.create({
            productId: newProductId,
            ...parsedProduct,
        }, { transaction });
        await transaction?.commit();
        return res.status(201).json({
            message: "Product created successfully",
            data: newProduct,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("add product failed:", error.message);
        return res.status(500).json({ message: "add product failed" });
    }
};
exports.addProduct = addProduct;
//update product
const updateProduct = async (req, res) => {
    const { id } = req.query;
    const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    try {
        const existingProduct = await product_1.Product.findByPk(id);
        if (!existingProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Nếu có ảnh mới được upload
        if (req.file) {
            if (req.file) {
                const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
                const result = await (0, converToWebp_1.uploadImageToCloudinary)(webpBuffer, "products", id);
                productData.productImage = result.secure_url;
            }
        }
        await existingProduct.update(productData);
        return res.status(200).json({
            message: "Product updated successfully",
            data: existingProduct,
        });
    }
    catch (error) {
        console.error("Update product error:", error.message);
        res.status(500).json({ message: "failed to upadte product" });
    }
};
exports.updateProduct = updateProduct;
//delete product
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await product_1.Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const imageName = product.productImage;
        await product.destroy();
        if (imageName && imageName.includes("cloudinary.com")) {
            const publicId = (0, converToWebp_1.getCloudinaryPublicId)(imageName);
            if (publicId) {
                await connectCloudinary_1.default.uploader.destroy(publicId);
            }
        }
        return res.status(200).json({ message: "Product deleted successfully" });
    }
    catch (error) {
        console.error("Delete product error:", error.message);
        res.status(500).json({ message: "Delete product failed" });
    }
};
exports.deleteProduct = deleteProduct;
//export excel
const exportExcelProduct = async (req, res) => {
    const { typeProduct, all = false } = req.body;
    try {
        let whereCondition = {};
        if (all === "true") {
            // xuất toàn bộ -> để whereCondition = {}
        }
        else if (typeProduct) {
            whereCondition.typeProduct = typeProduct;
        }
        const data = await product_1.Product.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            order: [
                //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`Product`.`productId`, 4) AS UNSIGNED)"), "ASC"],
            ],
        });
        await (0, excelExporter_1.exportExcelResponse)(res, {
            data: data,
            sheetName: "Danh sách sản phẩm",
            fileName: "product",
            columns: productRowAndColumn_1.productColumns,
            rows: productRowAndColumn_1.mappingProductRow,
        });
    }
    catch (error) {
        console.error("Export Excel error:", error.message);
        res.status(500).json({ message: "Lỗi xuất Excel" });
    }
};
exports.exportExcelProduct = exportExcelProduct;
//# sourceMappingURL=productController.js.map