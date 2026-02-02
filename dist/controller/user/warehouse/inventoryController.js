"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewInventory = exports.getAllInventory = void 0;
const inventoryService_1 = require("../../../service/warehouse/inventoryService");
const getAllInventory = async (req, res, next) => {
    const { page, pageSize } = req.query;
    try {
        const response = await inventoryService_1.inventoryService.getAllInventory(Number(page), Number(pageSize));
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
//# sourceMappingURL=inventoryController.js.map