import { NextFunction, Request, Response } from "express";
import { productService } from "../../../service/productService";

//get all product
export const getAllProduct = async (req: Request, res: Response, next: NextFunction) => {
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

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get product by fied
export const getProductByField = async (req: Request, res: Response, next: NextFunction) => {
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

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add product
export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await productService.createProduct(req, req.body);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//update product
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.query as { id: string };
  const productData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  try {
    const response = await productService.updatedProduct(req, id, productData);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete product
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const response = await productService.deletedProduct(id);
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
