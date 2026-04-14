"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRepository = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../models/order/order");
const customer_1 = require("../models/customer/customer");
const product_1 = require("../models/product/product");
const inventory_1 = require("../models/warehouse/inventory/inventory");
const liquidationInventory_1 = require("../models/warehouse/inventory/liquidationInventory");
exports.inventoryRepository = {
    //====================================INVENTORY========================================
    getInventoryByPage: async ({ page, pageSize, searching, }) => {
        const whereClause = {
            [sequelize_1.Op.and]: [{ qtyInventory: { [sequelize_1.Op.gt]: 0 } }],
        };
        if (searching && typeof searching === "object") {
            whereClause[sequelize_1.Op.and].push(searching);
        }
        const options = {
            where: whereClause,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "day",
                        "matE",
                        "matB",
                        "matC",
                        "matE2",
                        "songE",
                        "songB",
                        "songC",
                        "songE2",
                        "lengthPaperCustomer",
                        "paperSizeCustomer",
                        "quantityCustomer",
                        "dvt",
                        "pricePaper",
                        "totalPrice",
                        "vat",
                        "totalPriceVAT",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: product_1.Product, attributes: ["productName"] },
                    ],
                },
            ],
        };
        if (page !== undefined && pageSize !== undefined) {
            options.offset = (page - 1) * pageSize;
            options.limit = pageSize;
        }
        return await inventory_1.Inventory.findAndCountAll(options);
    },
    inventoryTotals: async () => {
        const result = await inventory_1.Inventory.findAll({
            where: { valueInventory: { [sequelize_1.Op.gt]: 0 } },
            attributes: [[sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("valueInventory")), "totalValueInventory"]],
            raw: true,
        });
        return result[0];
    },
    findInventoryByOrderId: async (orderId) => {
        return await inventory_1.Inventory.findOne({
            where: { orderId },
            attributes: ["qtyInventory"],
        });
    },
    findByOrderId: async ({ orderId, transaction, options = {}, }) => {
        return await inventory_1.Inventory.findOne({
            where: { orderId },
            transaction,
            lock: transaction.LOCK.UPDATE,
            ...options,
        });
    },
    syncInventory: async (orderId, transaction) => {
        return await inventory_1.Inventory.findOne({
            where: { orderId },
            attributes: ["inventoryId"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId"],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
            transaction,
        });
    },
    //====================================LIQUIDATION INVENTORY========================================
    getLiquidationInvByPage: async ({ page, pageSize, searching, }) => {
        const whereClause = {
            [sequelize_1.Op.and]: [{ qtyRemaining: { [sequelize_1.Op.gt]: 0 } }],
        };
        // if (searching && typeof searching === "object") {
        //   whereClause[Op.and].push(searching);
        // }
        const options = {
            where: whereClause,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "day",
                        "matE",
                        "matB",
                        "matC",
                        "matE2",
                        "songE",
                        "songB",
                        "songC",
                        "songE2",
                        "lengthPaperCustomer",
                        "paperSizeCustomer",
                        "quantityCustomer",
                        "dvt",
                        "pricePaper",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: product_1.Product, attributes: ["productName"] },
                    ],
                },
            ],
        };
        if (page !== undefined && pageSize !== undefined) {
            options.offset = (page - 1) * pageSize;
            options.limit = pageSize;
        }
        return await liquidationInventory_1.LiquidationInventory.findAndCountAll(options);
    },
    liquidationInvTotals: async () => {
        const result = await liquidationInventory_1.LiquidationInventory.findAll({
            where: { liquidationValue: { [sequelize_1.Op.gt]: 0 } },
            attributes: [[sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("liquidationValue")), "totalValueInventory"]],
            raw: true,
        });
        return result[0];
    },
};
//# sourceMappingURL=inventoryRepository.js.map