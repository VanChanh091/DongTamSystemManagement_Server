import { Order } from "../../../models/order/order";
import { NextFunction, Request, Response } from "express";
import { customerService } from "../../../service/customerService";
import { CustomerCreationAttributes } from "../../../models/customer/customer";

//get all
export const getAllCustomer = async (req: Request, res: Response, next: NextFunction) => {
  const {
    page = 1,
    pageSize = 20,
    noPaging = false,
  } = req.query as { page?: string; pageSize?: string; noPaging?: string | boolean };

  try {
    const response = await customerService.getAllCustomers({
      page: Number(page),
      pageSize: Number(pageSize),
      noPaging,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get by field
export const getCustomerByField = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await customerService.getCustomerByFields({
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

//get customerId in orders
//unfinished
export const checkCustomerInOrders = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId } = req.query as { customerId: string };

  try {
    const orderCount = await Order.count({ where: { customerId: customerId } });

    return res.status(200).json({ hasOrders: orderCount > 0, orderCount });
  } catch (error) {
    next(error);
  }
};

//create customer
export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await customerService.createCustomer(req.body as CustomerCreationAttributes);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// update
export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId } = req.query as { customerId: string };
  const { ...customerData } = req.body;

  try {
    const response = await customerService.updateCustomer(customerId, customerData);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// delete
export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId } = req.query as { customerId: string };

  try {
    const response = await customerService.deleteCustomer(customerId);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelCustomer = async (req: Request, res: Response, next: NextFunction) => {
  const { fromDate, toDate, all = false } = req.body;

  try {
    await customerService.exportExcelCustomer(res, { fromDate, toDate, all });
  } catch (error) {
    next(error);
  }
};
