"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllLiquidationInventory = exports.exportInventoryByDate = exports.migrateInitialInventoryLogs = exports.createNewInventory = exports.getAllInventory = void 0;
const inventoryService_1 = require("../../../service/inventory/inventoryService");
const appError_1 = require("../../../utils/appError");
const liquidationInvService_1 = require("../../../service/inventory/liquidationInvService");
const inventoryLogService_1 = require("../../../service/inventory/inventoryLogService");
//====================================INVENTORY========================================
const getAllInventory = async (req, res, next) => {
    const { field, keyword, page, pageSize, filter } = req.query;
    try {
        let response;
        if (field && keyword) {
            response = await inventoryService_1.inventoryService.getInventoryByField({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
                filter,
            });
        }
        else {
            response = await inventoryService_1.inventoryService.getAllInventory(Number(page), Number(pageSize), filter);
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
                response = await inventoryService_1.inventoryService.transferOrderQty(req, {
                    sourceOrderId,
                    targetOrderId,
                    qtyTransfer,
                    reason,
                });
                break;
            case "TRANSFER_TO_LIQUIDATION":
                if (!inventoryId || !qtyTransfer || !reason) {
                    throw appError_1.AppError.BadRequest("Thiếu thông tin để thực hiện chuyển giao đến kho thanh lý");
                }
                response = await inventoryService_1.inventoryService.transferQtyToLiquidationInv({
                    inventoryId: Array.isArray(inventoryId) ? inventoryId[0] : inventoryId,
                    qtyTransfer,
                    reason,
                });
                break;
            case "TRANSFER_TO_VARIANCE":
                if (!inventoryId) {
                    throw appError_1.AppError.BadRequest("Thiếu thông tin để thực hiện chuyển giao đến kho thanh lý");
                }
                const inventoryIds = Array.isArray(inventoryId) ? inventoryId : [inventoryId];
                response = await inventoryService_1.inventoryService.transferToQtyVariance({ inventoryIds: inventoryIds });
                break;
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createNewInventory = createNewInventory;
//================================INVENTORY LOGS=======================================
//migrate inventory log
const migrateInitialInventoryLogs = async (req, res, next) => {
    try {
        const response = await inventoryLogService_1.inventoryLogService.migrateInitialInventoryLogs();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.migrateInitialInventoryLogs = migrateInitialInventoryLogs;
//export excel
const exportInventoryByDate = async (req, res, next) => {
    const { targetDate } = req.body;
    try {
        await inventoryLogService_1.inventoryLogService.exportInventoryByDate(res, req.user.email, targetDate);
    }
    catch (error) {
        next(error);
    }
};
exports.exportInventoryByDate = exportInventoryByDate;
//=============================LIQUIDATION INVENTORY===================================
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