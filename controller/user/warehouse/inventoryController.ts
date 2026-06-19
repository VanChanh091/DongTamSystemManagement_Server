import { NextFunction, Request, Response } from "express";
import { inventoryService } from "../../../service/inventory/inventoryService";
import { AppError } from "../../../utils/appError";
import { liquidationInvService } from "../../../service/inventory/liquidationInvService";

//====================================INVENTORY========================================
export const getAllInventory = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize, filter } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
    filter: "gtZero" | "ltZero";
  };

  try {
    let response;

    if (field && keyword) {
      response = await inventoryService.getInventoryByField({
        field,
        keyword,
        page: Number(page),
        pageSize: Number(pageSize),
        filter,
      });
    } else {
      response = await inventoryService.getAllInventory(Number(page), Number(pageSize), filter);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createNewInventory = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };
  const { action, sourceOrderId, targetOrderId, qtyTransfer, inventoryId, reason } = req.body as {
    action: string;
    sourceOrderId?: string;
    targetOrderId?: string;
    qtyTransfer?: number;
    inventoryId?: number;
    reason?: string;
  };

  try {
    let response;

    switch (action) {
      case "CREATE":
        if (!orderId) throw AppError.BadRequest("Thiếu orderId cho hành động tạo mới");
        response = await inventoryService.createNewInventory(orderId);
        break;
      case "TRANSFER_QTY":
        if (!sourceOrderId || !targetOrderId || !qtyTransfer) {
          throw AppError.BadRequest("Thiếu thông tin để thực hiện chuyển giao");
        }
        response = await inventoryService.transferOrderQty(req, {
          sourceOrderId,
          targetOrderId,
          qtyTransfer,
          reason,
        });
        break;
      case "TRANSFER_TO_LIQUIDATION":
        if (!inventoryId || !qtyTransfer || !reason) {
          throw AppError.BadRequest("Thiếu thông tin để thực hiện chuyển giao đến kho thanh lý");
        }
        response = await inventoryService.transferQtyToLiquidationInv({
          inventoryId,
          qtyTransfer,
          reason,
        });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportInventory = async (req: Request, res: Response, next: NextFunction) => {
  const { date } = req.body;

  try {
    await inventoryService.exportExcelInventory(res, req.user.email, date);
  } catch (error) {
    next(error);
  }
};

//====================================LIQUIDATION INVENTORY========================================
export const getAllLiquidationInventory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    let response;

    if (field && keyword) {
      // response = await inventoryService.getInventoryByField({
      //   field,
      //   keyword,
      //   page: Number(page),
      //   pageSize: Number(pageSize),
      // });
    } else {
      response = await liquidationInvService.getAllLiquidationInv(Number(page), Number(pageSize));
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
