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
import dotenv from "dotenv";
import cloudinary from "../configs/connectCloudinary";
import { Sequelize } from "sequelize";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { mappingProductRow, productColumns } from "../utils/mapping/productRowAndColumn";
dotenv.config();

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
          return { ...JSON.parse(cachedData), fromCache: true };
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
        message: "",
        data,
        totalProducts,
        totalPages,
        currentPage: noPagingMode ? 1 : page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
    } catch (error) {
      console.error("❌ get all product failed:", error);
      throw new AppError("get all product failed", 500);
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
        throw new AppError("Invalid field parameter", 400);
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
      throw new AppError(`Failed to get product by ${field}`, 500);
    }
  },

  createProduct: async (req: Request, data: any) => {
    const { prefix = "CUSTOM", ...product } = data;
    const transaction = await Product.sequelize?.transaction();

    try {
      const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();

      // Check prefix đã tồn tại chưa
      const prefixExists = await productRepository.checkPrefixProduct(sanitizedPrefix, transaction);

      if (prefixExists) {
        await transaction?.rollback();
        throw new AppError(
          `Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`,
          400
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
        product.productImage = result.secure_url;
      }

      const newProduct = await productRepository.createProduct(
        { productId: newProductId, ...product },
        transaction
      );

      await transaction?.commit();

      return { message: "Product created successfully", data: newProduct };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ add product failed:", error);
      throw new AppError("add product failed", 500);
    }
  },

  updatedProduct: async (req: Request, producId: string, productData: any) => {
    const transaction = await Product.sequelize?.transaction();

    try {
      const existingProduct = await productRepository.findProductByPk(producId);
      if (!existingProduct) {
        throw new AppError("Product not found", 404);
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
      throw new AppError("Update product error", 500);
    }
  },

  deletedProduct: async (producId: string) => {
    const transaction = await Product.sequelize?.transaction();

    try {
      const product = await productRepository.findProductByPk(producId);
      if (!product) {
        throw new AppError("Product not found", 404);
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
      throw new AppError("Delete product error", 500);
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
      throw new AppError("Export Excel error", 500);
    }
  },
};
