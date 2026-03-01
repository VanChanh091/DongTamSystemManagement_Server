import { NextFunction, Request, Response } from "express";
import { productService } from "../../../service/productService";
import { ProductCreationAttributes } from "../../../models/product/product";

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  const {
    field,
    keyword,
    page = 1,
    pageSize = 20,
    noPaging = false,
  } = req.query as {
    field?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
    noPaging?: string | boolean;
  };

  try {
    let response;

    // 1. Nhánh tìm kiếm theo field
    if (field && keyword) {
      response = await productService.getProductByField({
        field,
        keyword,
        page: Number(page),
        pageSize: Number(pageSize),
      });
    }
    // 2. Nhánh lấy tất cả
    else {
      response = await productService.getAllProducts({
        page: Number(page),
        pageSize: Number(pageSize),
        noPaging,
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add product
export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await productService.createProduct(req, req.body as ProductCreationAttributes);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//update product
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.query as { productId: string };
  const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  try {
    const response = await productService.updatedProduct(req, productId, productData);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete product
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.query as { productId: string };

  try {
    const response = await productService.deletedProduct(productId, req.user.role);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { typeProduct, all = false } = req.body;

  try {
    await productService.exportExcelProducts(res, { typeProduct, all });
  } catch (error) {
    next(error);
  }
};
