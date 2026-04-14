"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllLiquidationInventory = exports.exportInventory = exports.createNewInventory = exports.getAllInventory = void 0;
const inventoryService_1 = require("../../../service/warehouse/inventoryService");
const appError_1 = require("../../../utils/appError");
const liquidationInvService_1 = require("../../../service/warehouse/liquidationInvService");
//====================================INVENTORY========================================
const getAllInventory = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        let response;
        if (field && keyword) {
            response = await inventoryService_1.inventoryService.getInventoryByField({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
            });
        }
        else {
            response = await inventoryService_1.inventoryService.getAllInventory(Number(page), Number(pageSize));
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllInventory = getAllInventory;
const createNewInventory = async (req, res, next) => {
    const { orderId } = req.query;
    const { action, sourceOrderId, targetOrderId, qtyTransfer, inventoryId, reason } = req.body;
    try {
        let response;
        switch (action) {
            case "CREATE":
                if (!orderId)
                    throw appError_1.AppError.BadRequest("Thiếu orderId cho hành động tạo mới");
                response = await inventoryService_1.inventoryService.createNewInventory(orderId);
                break;
            case "TRANSFER_QTY":
                if (!sourceOrderId || !targetOrderId || !qtyTransfer) {
                    throw appError_1.AppError.BadRequest("Thiếu thông tin để thực hiện chuyển giao");
                }
                response = await inventoryService_1.inventoryService.transferOrderQty({
                    sourceOrderId,
                    targetOrderId,
                    qtyTransfer,
                });
                break;
            case "TRANSFER_TO_LIQUIDATION":
                if (!inventoryId || !qtyTransfer || !reason) {
                    throw appError_1.AppError.BadRequest("Thiếu thông tin để thực hiện chuyển giao đến kho thanh lý");
                }
                response = await inventoryService_1.inventoryService.transferQtyToLiquidationInv({
                    inventoryId,
                    qtyTransfer,
                    reason,
                });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewInventory = createNewInventory;
//export excel
const exportInventory = async (req, res, next) => {
    try {
        await inventoryService_1.inventoryService.exportExcelInventory(res);
    }
    catch (error) {
        next(error);
    }
};
exports.exportInventory = exportInventory;
//====================================LIQUIDATION INVENTORY========================================
const getAllLiquidationInventory = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        let response;
        if (field && keyword) {
            // response = await inventoryService.getInventoryByField({
            //   field,
            //   keyword,
            //   page: Number(page),
            //   pageSize: Number(pageSize),
            // });
        }
        else {
            response = await liquidationInvService_1.liquidationInvService.getAllLiquidationInv(Number(page), Number(pageSize));
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllLiquidationInventory = getAllLiquidationInventory;
//# sourceMappingURL=inventoryController.js.map