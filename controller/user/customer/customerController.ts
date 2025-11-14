import { Order } from "../../../models/order/order";
import { Request, Response } from "express";
import { customerService } from "../../../service/customerService";
import { CustomerCreationAttributes } from "../../../models/customer/customer";

//get all
export const getAllCustomer = async (req: Request, res: Response) => {
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

    return res.status(200).json({
      ...response,
      message: response.fromCache
        ? "Get all customers from cache"
        : "Get all customers successfully",
    });
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get by field
export const getCustomerByField = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get customerId in orders
//unfinished
export const checkCustomerInOrders = async (req: Request, res: Response) => {
  const { customerId } = req.query as { customerId: string };

  try {
    const orderCount = await Order.count({ where: { customerId: customerId } });

    return res.status(200).json({ hasOrders: orderCount > 0, orderCount });
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//create customer
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const response = await customerService.createCustomer(req.body as CustomerCreationAttributes);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

// update
export const updateCustomer = async (req: Request, res: Response) => {
  const { customerId } = req.query as { customerId: string };
  const { ...customerData } = req.body;

  try {
    const response = await customerService.updateCustomer(customerId, customerData);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

// delete
export const deleteCustomer = async (req: Request, res: Response) => {
  const { customerId } = req.query as { customerId: string };

  try {
    const response = await customerService.deleteCustomer(customerId);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//export excel
export const exportExcelCustomer = async (req: Request, res: Response) => {
  const { fromDate, toDate, all = false } = req.body;

  try {
    await customerService.exportExcelCustomer(res, { fromDate, toDate, all });
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
