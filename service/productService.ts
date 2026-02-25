import dotenv from "dotenv";
dotenv.config();

import redisCache from "../assest/configs/redisCache";
import { Op } from "sequelize";
import { Request, Response } from "express";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { productRepository } from "../repository/productRepository";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { filterDataFromCache } from "../utils/helper/modelHelper/orderHelpers";
import {
  convertToWebp,
  getCloudinaryPublicId,
  uploadImageToCloudinary,
} from "../utils/image/converToWebp";
import cloudinary from "../assest/configs/connectCloudinary";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { mappingProductRow, productColumns } from "../utils/mapping/productRowAndColumn";
import { runInTransaction } from "../utils/helper/transactionHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { product } = CacheKey;

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
        await CacheManager.clear("product");
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

    try {
      return await runInTransaction(async (transaction) => {
        const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();

        // Check prefix đã tồn tại chưa
        const existedPrefix = await Product.count({
          where: { productId: { [Op.like]: `${sanitizedPrefix}%` } },
        });

        if (existedPrefix > 0) {
          throw AppError.Conflict(
            `Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`,
            "PREFIX_ALREADY_EXISTS",
          );
        }

        const maxSeq = (await Product.max("productSeq", { transaction })) ?? 0;

        //create next id
        const nextId = Number(maxSeq) + 1;
        const newProductId = `${prefix}${String(nextId).padStart(4, "0")}`;

        if (req.file) {
          const webpBuffer = await convertToWebp(req.file.buffer);
          const result = await uploadImageToCloudinary(
            webpBuffer,
            "products",
            newProductId.replace(/\s+/g, "_"),
          );
          parsedProduct.productImage = result.secure_url;
        }

        const newProduct = await productRepository.createProduct(
          { productId: newProductId, productSeq: nextId, ...parsedProduct },
          transaction,
        );

        return { message: "Product created successfully", data: newProduct };
      });
    } catch (error) {
      console.error("❌ add product failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updatedProduct: async (req: Request, producId: string, productData: any) => {
    try {
      return await runInTransaction(async (transaction) => {
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
          transaction,
        );

        return { message: "Product updated successfully", data: result };
      });
    } catch (error) {
      console.error("❌ Update product error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deletedProduct: async (productId: string, role: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const product = await productRepository.findProductByPk(productId);
        if (!product) {
          throw AppError.NotFound("Product not found", "PRODUCT_NOT_FOUND");
        }

        const orderCount = await Order.count({ where: { productId }, transaction });
        if (orderCount > 0) {
          if (role != "admin") {
            throw AppError.Conflict(
              `Product with ID '${productId}' has associated orders and cannot be deleted.`,
              "PRODUCT_HAS_ORDERS",
            );
          }
        }

        const imageName = product.productImage;

        await product.destroy();

        if (imageName && imageName.includes("cloudinary.com")) {
          const publicId = getCloudinaryPublicId(imageName);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }

        return { message: "Product deleted successfully" };
      });
    } catch (error) {
      console.error("❌ Delete product error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelProducts: async (
    res: Response,
    { typeProduct, all }: { typeProduct: string; all: string | boolean },
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
