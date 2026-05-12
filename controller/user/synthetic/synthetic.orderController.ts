import { NextFunction, Request, Response } from "express";
import { syntheticOrderService } from "../../../service/synthetic/synthetic.orderService";

export const getAllSyntheticOrders = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, status, allOrders, orderId, field, keyword, startDate, endDate } =
    req.query as {
      page?: string;
      pageSize?: string;
      allOrders?: string;
      orderId?: string;
      status: string | string[];
      field?: string;
      keyword?: string;
      startDate?: string;
      endDate?: string;
    };

  try {
    // Xử lý trường hợp status truyền vào là chuỗi phẩy "pending,accepted"
    // hoặc là mảng có sẵn từ query của Express
    let response;
    let statusArray: string | string[] = [];

    if (status) {
      if (typeof status === "string" && status.includes(",")) {
        statusArray = status.split(",");
      } else {
        statusArray = status as string | string[];
      }
    } else if (orderId) {
      response = await syntheticOrderService.getPlanningBoxDetail(orderId);
    } else if (field && keyword) {
      response = await syntheticOrderService.getSyntheticOrderByField({
        field,
        keyword,
        page: Number(page),
        pageSize: Number(pageSize),
        status: statusArray,
        allOrders,
        startDate,
        endDate,
      });
    } else {
      response = await syntheticOrderService.getAllOrderByStatus({
        page: Number(page),
        pageSize: Number(pageSize),
        status: statusArray,
        allOrders,
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelOrders = async (req: Request, res: Response, next: NextFunction) => {
  const { fromDate, toDate } = req.body;

  try {
    await syntheticOrderService.exportExcelOrder(res, { fromDate, toDate });
  } catch (error) {
    next(error);
  }
};
