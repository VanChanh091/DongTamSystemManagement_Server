import { NextFunction, Request, Response } from "express";
import { orderService } from "../../../service/orderService";

//===============================ORDER AUTOCOMPLETE=====================================

export const getOrderIdRaw = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };

  try {
    const response = await orderService.getOrderIdRaw(orderId);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };

  try {
    const response = await orderService.getOrderDetail(orderId);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================ACCEPT AND PLANNING=====================================

export const getOrdersAcceptPlanning = async (req: Request, res: Response, next: NextFunction) => {
  const {
    field,
    keyword,
    page = 1,
    pageSize = 20,
    ownOnly = "false",
  } = req.query as {
    field?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
    ownOnly?: string;
  };

  try {
    let response;

    // 1. Nhánh tìm kiếm theo field
    if (field && keyword) {
      response = await orderService.getOrderByField(
        field,
        keyword,
        Number(page),
        Number(pageSize),
        req.user,
      );
    }
    // 2. Nhánh lấy tất cả
    else {
      response = await orderService.getOrderAcceptAndPlanning(
        Number(page),
        Number(pageSize),
        ownOnly,
        req.user,
      );
    }

    return res.status(200).json(response);
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
    const response = await orderService.updateOrder(req, req.body, orderId);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// delete order
export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };

  try {
    const response = await orderService.deleteOrder(orderId);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
