import { Product } from "../../../models/product/product";
import cloudinary from "../../../configs/connectCloudinary";
import { Op, Sequelize } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId";
import {
  convertToWebp,
  getCloudinaryPublicId,
  uploadImageToCloudinary,
} from "../../../utils/image/converToWebp";
import { exportExcelResponse } from "../../../utils/helper/excelExporter";
import { filterDataFromCache } from "../../../utils/helper/modelHelper/orderHelpers";
import { mappingProductRow, productColumns } from "../../../utils/mapping/productRowAndColumn";
import { CacheManager } from "../../../utils/helper/cacheManager";
import redisCache from "../../../configs/redisCache";
import { Request, response, Response } from "express";
import { productService } from "../../../service/productService";

//get all product
export const getAllProduct = async (req: Request, res: Response) => {
  const {
    page = 1,
    pageSize = 20,
    noPaging = false,
  } = req.query as { page?: string; pageSize?: string; noPaging?: string | boolean };

  try {
    const response = await productService.getAllProducts({
      page: Number(page),
      pageSize: Number(pageSize),
      noPaging,
    });

    res.status(200).json({
      ...response,
      message: response.fromCache ? "Get all products from cache" : "get all products successfully",
    });
  } catch (error: any) {
    res.status(error.statusCode).json({ message: error.message });
  }
};

//get product by fied
export const getProductByField = async (req: Request, res: Response) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await productService.getProductByField({
      field,
      keyword,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.status(200).json(response);
  } catch (error: any) {
    res.status(error.statusCode).json({ message: error.message });
  }
};

//add product
export const addProduct = async (req: Request, res: Response) => {
  try {
    const response = await productService.createProduct(req, req.body);
    return res.status(201).json(response);
  } catch (error: any) {
    res.status(error.statusCode).json({ message: error.message });
  }
};

//update product
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.query as { id: string };
  const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  try {
    const response = await productService.updatedProduct(req, id, productData);
    return res.status(200).json(response);
  } catch (error: any) {
    res.status(error.statusCode).json({ message: error.message });
  }
};

//delete product
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const response = await productService.deletedProduct(id);
    return res.status(200).json(response);
  } catch (error: any) {
    res.status(error.statusCode).json({ message: error.message });
  }
};

//export excel
export const exportExcelProduct = async (req: Request, res: Response) => {
  const { typeProduct, all = false } = req.body;

  try {
    const response = await productService.exportExcelProducts(res, { typeProduct, all });
    res.status(200).json(response);
  } catch (error: any) {
    res.status(error.statusCode).json({ message: error.message });
  }
};
