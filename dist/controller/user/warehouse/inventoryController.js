"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportInventory = exports.createNewInventory = exports.getAllInventory = void 0;
const inventoryService_1 = require("../../../service/warehouse/inventoryService");
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
    let { orderId } = req.query;
    try {
        const response = await inventoryService_1.inventoryService.createNewInventory(orderId);
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
//# sourceMappingURL=inventoryController.js.map