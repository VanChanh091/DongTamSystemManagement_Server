import { NextFunction, Request, Response } from "express";
import { orderService } from "../../../service/orderService";

//===============================ACCEPT AND PLANNING=====================================

//get order status accept and planning
export const getOrderAcceptAndPlanning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    page = 1,
    pageSize = 20,
    ownOnly = "false",
  } = req.query as { page?: string; pageSize?: string; ownOnly?: string };

  try {
    const response = await orderService.getOrderAcceptAndPlanning(
      Number(page),
      Number(pageSize),
      ownOnly,
      req.user
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getOrderByField = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await orderService.getOrderByField(
      field,
      keyword,
      Number(page),
      Number(pageSize),
      req.user
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================PENDING AND REJECT=====================================

//get order pending and reject
export const getOrderPendingAndReject = async (req: Request, res: Response, next: NextFunction) => {
  const { ownOnly = "false" } = req.query as { ownOnly?: string };

  try {
    const response = await orderService.getOrderPendingAndReject(ownOnly, req.user);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//add order
export const addOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await orderService.createOrder(req.user, req.body);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// update order
export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };

  try {
    const response = await orderService.updateOrder(req.body, orderId);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// delete order
export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.query as { id: string };

  try {
    const response = await orderService.deleteOrder(id);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
