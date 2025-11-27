"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisCache_1 = __importDefault(require("../configs/redisCache"));
const product_1 = require("../models/product/product");
const productRepository_1 = require("../repository/productRepository");
const appError_1 = require("../utils/appError");
const cacheManager_1 = require("../utils/helper/cacheManager");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const converToWebp_1 = require("../utils/image/converToWebp");
const generateNextId_1 = require("../utils/helper/generateNextId");
const connectCloudinary_1 = __importDefault(require("../configs/connectCloudinary"));
const excelExporter_1 = require("../utils/helper/excelExporter");
const productRowAndColumn_1 = require("../utils/mapping/productRowAndColumn");
const devEnvironment = process.env.NODE_ENV !== "production";
const { product } = cacheManager_1.CacheManager.keys;
exports.productService = {
    getAllProducts: async ({ page = 1, pageSize = 20, noPaging = false, }) => {
        const noPagingMode = noPaging === "true";
        const cacheKey = noPaging === "true" ? product.all : product.page(page);
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
                    return { ...parsed, message: `Get all products from cache` };
                }
            }
            let data, totalPages;
            const totalProducts = await productRepository_1.productRepository.productCount();
            if (noPagingMode) {
                totalPages = 1;
                data = await productRepository_1.productRepository.findAllProduct();
            }
            else {
                totalPages = Math.ceil(totalProducts / pageSize);
                data = await productRepository_1.productRepository.findProductByPage(page, pageSize);
            }
            const responseData = {
                message: "get all products successfully",
                data,
                totalProducts,
                totalPages,
                currentPage: noPagingMode ? 1 : page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get all product failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getProductByField: async ({ field, keyword, page, pageSize, }) => {
        try {
            const fieldMap = {
                productId: (product) => product.productId,
                productName: (product) => product?.productName,
            };
            const key = field;
            if (!key || !fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, orderHelpers_1.filterDataFromCache)({
                model: product_1.Product,
                cacheKey: product.search,
                keyword: keyword,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
            });
            return result;
        }
        catch (error) {
            console.error(`❌ Failed to get product by ${field}:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createProduct: async (req, data) => {
        const { prefix = "CUSTOM", product } = data;
        const parsedProduct = typeof product === "string" ? JSON.parse(product) : product;
        const transaction = await product_1.Product.sequelize?.transaction();
        try {
            const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
            // Check prefix đã tồn tại chưa
            const prefixExists = await productRepository_1.productRepository.checkPrefixProduct(sanitizedPrefix, transaction);
            if (prefixExists) {
                throw appError_1.AppError.Conflict(`Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`, "PREFIX_ALREADY_EXISTS");
            }
            const products = await productRepository_1.productRepository.findAllById(transaction);
            //custom productId
            const allProductIds = products.map((p) => p.productId);
            const newProductId = (0, generateNextId_1.generateNextId)(allProductIds, sanitizedPrefix, 4);
            if (req.file) {
                const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
                const result = await (0, converToWebp_1.uploadImageToCloudinary)(webpBuffer, "products", newProductId.replace(/\s+/g, "_"));
                parsedProduct.productImage = result.secure_url;
            }
            const newProduct = await productRepository_1.productRepository.createProduct({ productId: newProductId, ...parsedProduct }, transaction);
            await transaction?.commit();
            return { message: "Product created successfully", data: newProduct };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("❌ add product failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updatedProduct: async (req, producId, productData) => {
        const transaction = await product_1.Product.sequelize?.transaction();
        try {
            const existingProduct = await productRepository_1.productRepository.findProductByPk(producId);
            if (!existingProduct) {
                throw appError_1.AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
            }
            // Nếu có ảnh mới được upload
            if (req.file) {
                if (req.file) {
                    const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
                    const result = await (0, converToWebp_1.uploadImageToCloudinary)(webpBuffer, "products", producId);
                    productData.productImage = result.secure_url;
                }
            }
            const result = await productRepository_1.productRepository.updateProduct(existingProduct, productData, transaction);
            await transaction?.commit();
            return { message: "Product updated successfully", data: result };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("❌ Update product error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deletedProduct: async (producId) => {
        const transaction = await product_1.Product.sequelize?.transaction();
        try {
            const product = await productRepository_1.productRepository.findProductByPk(producId);
            if (!product) {
                throw appError_1.AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
            }
            const imageName = product.productImage;
            await product.destroy();
            if (imageName && imageName.includes("cloudinary.com")) {
                const publicId = (0, converToWebp_1.getCloudinaryPublicId)(imageName);
                if (publicId) {
                    await connectCloudinary_1.default.uploader.destroy(publicId);
                }
            }
            await transaction?.commit();
            return { message: "Product deleted successfully" };
        }
        catch (error) {
            await transaction?.rollback();
            console.error("❌ Delete product error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelProducts: async (res, { typeProduct, all }) => {
        try {
            let whereCondition = {};
            if (all === "true") {
                // xuất toàn bộ -> để whereCondition = {}
            }
            else if (typeProduct) {
                whereCondition.typeProduct = typeProduct;
            }
            const data = await productRepository_1.productRepository.exportExcelProducts(whereCondition);
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Danh sách sản phẩm",
                fileName: "product",
                columns: productRowAndColumn_1.productColumns,
                rows: productRowAndColumn_1.mappingProductRow,
            });
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=productService.js.map