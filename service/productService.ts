import dotenv from "dotenv";
dotenv.config();
import redisCache from "../configs/redisCache";
import { Product } from "../models/product/product";
import { productRepository } from "../repository/productRepository";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cacheManager";
import { filterDataFromCache } from "../utils/helper/modelHelper/orderHelpers";
import {
  convertToWebp,
  getCloudinaryPublicId,
  uploadImageToCloudinary,
} from "../utils/image/converToWebp";
import { generateNextId } from "../utils/helper/generateNextId";
import { Request, Response } from "express";
import cloudinary from "../configs/connectCloudinary";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { mappingProductRow, productColumns } from "../utils/mapping/productRowAndColumn";

const devEnvironment = process.env.NODE_ENV !== "production";
const { product } = CacheManager.keys;

export const productService = {
  getAllProducts: async ({
    page = 1,
    pageSize = 20,
    noPaging = false,
  }: {
    page?: number;
    pageSize?: number;
    noPaging?: string | boolean;
  }) => {
    const noPagingMode = noPaging === "true";
    const cacheKey = noPaging === "true" ? product.all : product.page(page);

    try {
      const { isChanged } = await CacheManager.check(Product, "product");

      if (isChanged) {
        await CacheManager.clearProduct();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Product from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all products from cache` };
        }
      }

      let data, totalPages;
      const totalProducts = await productRepository.productCount();

      if (noPagingMode) {
        totalPages = 1;
        data = await productRepository.findAllProduct();
      } else {
        totalPages = Math.ceil(totalProducts / pageSize);
        data = await productRepository.findProductByPage(page, pageSize);
      }

      const responseData = {
        message: "get all products successfully",
        data,
        totalProducts,
        totalPages,
        currentPage: noPagingMode ? 1 : page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get all product failed:", error);
      throw AppError.ServerError();
    }
  },

  getProductByField: async ({
    field,
    keyword,
    page,
    pageSize,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
  }) => {
    try {
      const fieldMap = {
        productId: (product: Product) => product.productId,
        productName: (product: Product) => product?.productName,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!key || !fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }
      const result = await filterDataFromCache({
        model: Product,
        cacheKey: product.search,
        keyword: keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
      });

      return result;
    } catch (error) {
      console.error(`❌ Failed to get product by ${field}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createProduct: async (req: Request, data: any) => {
    const { prefix = "CUSTOM", product } = data;
    const parsedProduct = typeof product === "string" ? JSON.parse(product) : product;

    const transaction = await Product.sequelize?.transaction();

    try {
      const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();

      // Check prefix đã tồn tại chưa
      const prefixExists = await productRepository.checkPrefixProduct(sanitizedPrefix, transaction);

      if (prefixExists) {
        throw AppError.Conflict(
          `Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`,
          "PREFIX_ALREADY_EXISTS"
        );
      }

      const products = await productRepository.findAllById(transaction);

      //custom productId
      const allProductIds = products.map((p) => p.productId);
      const newProductId = generateNextId(allProductIds, sanitizedPrefix, 4);

      if (req.file) {
        const webpBuffer = await convertToWebp(req.file.buffer);
        const result = await uploadImageToCloudinary(
          webpBuffer,
          "products",
          newProductId.replace(/\s+/g, "_")
        );
        parsedProduct.productImage = result.secure_url;
      }

      const newProduct = await productRepository.createProduct(
        { productId: newProductId, ...parsedProduct },
        transaction
      );

      await transaction?.commit();

      return { message: "Product created successfully", data: newProduct };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ add product failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatedProduct: async (req: Request, producId: string, productData: any) => {
    const transaction = await Product.sequelize?.transaction();

    try {
      const existingProduct = await productRepository.findProductByPk(producId);
      if (!existingProduct) {
        throw AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
      }

      // Nếu có ảnh mới được upload
      if (req.file) {
        if (req.file) {
          const webpBuffer = await convertToWebp(req.file.buffer);
          const result = await uploadImageToCloudinary(webpBuffer, "products", producId);
          productData.productImage = result.secure_url;
        }
      }

      const result = await productRepository.updateProduct(
        existingProduct,
        productData,
        transaction
      );

      await transaction?.commit();

      return { message: "Product updated successfully", data: result };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ Update product error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deletedProduct: async (producId: string) => {
    const transaction = await Product.sequelize?.transaction();

    try {
      const product = await productRepository.findProductByPk(producId);
      if (!product) {
        throw AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
      }

      const imageName = product.productImage;

      await product.destroy();

      if (imageName && imageName.includes("cloudinary.com")) {
        const publicId = getCloudinaryPublicId(imageName);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }

      await transaction?.commit();

      return { message: "Product deleted successfully" };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ Delete product error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelProducts: async (
    res: Response,
    { typeProduct, all }: { typeProduct: string; all: string | boolean }
  ) => {
    try {
      let whereCondition: any = {};

      if (all === "true") {
        // xuất toàn bộ -> để whereCondition = {}
      } else if (typeProduct) {
        whereCondition.typeProduct = typeProduct;
      }

      const data = await productRepository.exportExcelProducts(whereCondition);

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Danh sách sản phẩm",
        fileName: "product",
        columns: productColumns,
        rows: mappingProductRow,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      throw AppError.ServerError();
    }
  },
};
