"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const redis_config_1 = __importDefault(require("../assest/configs/connect/redis.config"));
const order_1 = require("../models/order/order");
const product_1 = require("../models/product/product");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const productRepository_1 = require("../repository/productRepository");
const appError_1 = require("../utils/appError");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const converToWebp_1 = require("../utils/image/converToWebp");
const cloudinary_config_1 = __importDefault(require("../assest/configs/connect/cloudinary.config"));
const excelExporter_1 = require("../utils/helper/excelExporter");
const productRowAndColumn_1 = require("../utils/mapping/productRowAndColumn");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const melisearch_config_1 = require("../assest/configs/connect/melisearch.config");
const meiliService_1 = require("./meiliService");
const devEnvironment = process.env.NODE_ENV !== "production";
const { product } = cacheKey_1.CacheKey;
exports.productService = {
    getAllProducts: async ({ page = 1, pageSize = 20, noPaging = false, }) => {
        const noPagingMode = noPaging === "true";
        const cacheKey = noPaging === "true" ? product.all : product.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(product_1.Product, "product");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("product");
            }
            else {
                const cachedData = await redis_config_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Product from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all products from cache` };
                }
            }
            let data, totalPages, totalProducts;
            if (noPagingMode) {
                data = await productRepository_1.productRepository.findAllProduct();
                totalProducts = data.length;
                totalPages = 1;
            }
            else {
                const { rows, count } = await productRepository_1.productRepository.findProductByPage({ page, pageSize });
                data = rows;
                totalProducts = count;
                totalPages = Math.ceil(totalProducts / pageSize);
            }
            const responseData = {
                message: "get all products successfully",
                data,
                totalProducts,
                totalPages,
                currentPage: noPagingMode ? 1 : page,
            };
            await redis_config_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get all product failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getProductByField: async ({ field, keyword, page, pageSize, }) => {
        try {
            const validFields = ["productName", "productId"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = melisearch_config_1.meiliClient.index("products");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                // Phân trang
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            return {
                message: "Get products from Meilisearch",
                data: searchResult.hits,
                totalProducts: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
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
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
                // Check prefix đã tồn tại chưa
                const existedPrefix = await product_1.Product.count({
                    where: { productId: { [sequelize_1.Op.like]: `${sanitizedPrefix}%` } },
                });
                if (existedPrefix > 0) {
                    throw appError_1.AppError.Conflict(`Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`, "PREFIX_ALREADY_EXISTS");
                }
                const maxSeq = (await product_1.Product.max("productSeq", { transaction })) ?? 0;
                //create next id
                const nextId = Number(maxSeq) + 1;
                const newProductId = `${prefix}${String(nextId).padStart(4, "0")}`;
                if (req.file) {
                    const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
                    const result = await (0, converToWebp_1.uploadImageToCloudinary)({
                        buffer: webpBuffer,
                        folder: "products",
                        publicId: newProductId.replace(/\s+/g, "_"),
                    });
                    parsedProduct.productImage = result.secure_url;
                }
                const newProduct = await productRepository_1.productRepository.createProduct({ productId: newProductId, productSeq: nextId, ...parsedProduct }, transaction);
                //create meilisearch
                const productCreated = await productRepository_1.productRepository.findProductByPk(newProductId, transaction);
                if (productCreated) {
                    meiliService_1.meiliService.syncMeiliData(meiliService_1.MEILI_INDEX.PRODUCTS, productCreated.toJSON());
                }
                return { message: "Product created successfully", data: newProduct };
            });
        }
        catch (error) {
            console.error("❌ add product failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updatedProduct: async (req, producId, productData) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existingProduct = await productRepository_1.productRepository.findProductByPk(producId, transaction);
                if (!existingProduct) {
                    throw appError_1.AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
                }
                // Nếu có ảnh mới được upload
                if (req.file) {
                    if (req.file) {
                        const webpBuffer = await (0, converToWebp_1.convertToWebp)(req.file.buffer);
                        const result = await (0, converToWebp_1.uploadImageToCloudinary)({
                            buffer: webpBuffer,
                            folder: "products",
                            publicId: producId,
                        });
                        productData.productImage = result.secure_url;
                    }
                }
                const result = await productRepository_1.productRepository.updateProduct(existingProduct, productData, transaction);
                //update meilisearch
                const productUpdated = await productRepository_1.productRepository.findProductByPk(producId, transaction);
                if (productUpdated) {
                    meiliService_1.meiliService.syncMeiliData(meiliService_1.MEILI_INDEX.PRODUCTS, productUpdated.toJSON());
                }
                return { message: "Product updated successfully", data: result };
            });
        }
        catch (error) {
            console.error("❌ Update product error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    deletedProduct: async (productId, role) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const product = await productRepository_1.productRepository.findProductByPk(productId, transaction);
                if (!product) {
                    throw appError_1.AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
                }
                const orderCount = await order_1.Order.count({ where: { productId }, transaction });
                if (orderCount > 0) {
                    if (role != "admin") {
                        throw appError_1.AppError.Conflict(`Product with ID '${productId}' has associated orders and cannot be deleted.`, "PRODUCT_HAS_ORDERS");
                    }
                }
                const imageName = product.productImage;
                if (imageName && imageName.includes("cloudinary.com")) {
                    const publicId = (0, converToWebp_1.getCloudinaryPublicId)(imageName);
                    if (publicId) {
                        await cloudinary_config_1.default.uploader.destroy(publicId);
                    }
                }
                await product.destroy();
                //delete record in meilisearch
                meiliService_1.meiliService.deleteMeiliData(meiliService_1.MEILI_INDEX.PRODUCTS, productId);
                return { message: "Product deleted successfully" };
            });
        }
        catch (error) {
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
            const { rows } = await productRepository_1.productRepository.findProductByPage({ whereCondition });
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: rows,
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