"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRepository = void 0;
const user_1 = require("../models/user/user");
const order_1 = require("../models/order/order");
const product_1 = require("../models/product/product");
const customer_1 = require("../models/customer/customer");
const sequelize_1 = require("sequelize");
const inventory_1 = require("../models/warehouse/inventory/inventory");
const liquidationInventory_1 = require("../models/warehouse/inventory/liquidationInventory");
const inventoryTransfers_1 = require("../models/warehouse/inventory/inventoryTransfers");
exports.inventoryRepository = {
    //====================================INVENTORY========================================
    buildInventoryOptions: ({ page, pageSize, filter, //gt or lt
    searching, isExport = false, }) => {
        const operator = isExport ? sequelize_1.Op.gt : filter === "gtZero" ? sequelize_1.Op.gt : sequelize_1.Op.lt;
        const whereClause = {
            [sequelize_1.Op.and]: [{ qtyInventory: { [operator]: 0 } }],
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
                        "QC_box",
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
                        "lengthPaperManufacture",
                        "paperSizeManufacture",
                        "quantityCustomer",
                        "dvt",
                        "pricePaper",
                        "totalPrice",
                        "vat",
                        "totalPriceVAT",
                        "isFSC",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                        { model: user_1.User, attributes: ["fullName"] },
                    ],
                },
                { model: inventoryTransfers_1.InventoryTransfers, as: "invTransfers", attributes: ["qtyTransfers"] },
            ],
        };
        if (page && pageSize) {
            options.offset = (page - 1) * pageSize;
            options.limit = pageSize;
            options.order = [
                [order_1.Order, customer_1.Customer, "customerName", "ASC"],
                [order_1.Order, "orderSortValue", "ASC"],
            ];
        }
        if (isExport) {
            options.raw = true;
            options.nest = true;
        }
        return options;
    },
    getTargetOrder: async (targetOrderId, transaction) => {
        return await order_1.Order.findOne({
            where: { orderId: targetOrderId },
            attributes: [
                "orderId",
                "flute",
                "status",
                "pricePaper",
                "lengthPaperCustomer",
                "paperSizeCustomer",
                "quantityCustomer",
                "quantityManufacture",
            ],
            transaction,
        });
    },
    inventoryTotals: async (whereCondition) => {
        const result = await inventory_1.Inventory.findAll({
            where: { ...whereCondition, qtyInventory: { [sequelize_1.Op.gt]: 0 } },
            attributes: [[sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("valueInventory")), "totalValueInventory"]],
            include: [
                {
                    model: order_1.Order,
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: product_1.Product,
                            attributes: [],
                            required: true,
                            where: { typeProduct: { [sequelize_1.Op.ne]: "Phí Khác" } },
                        },
                    ],
                },
            ],
            raw: true,
        });
        return result[0];
    },
    findInventoryByOrderId: async (orderId) => {
        return await inventory_1.Inventory.findOne({
            where: { orderId },
            attributes: ["qtyInventory", "totalQtyOutbound"],
        });
    },
    getQueryOptions: (transaction, options = {}) => ({
        transaction,
        lock: transaction.LOCK.UPDATE,
        ...options,
    }),
    findInvByOrderId: async ({ orderId, transaction, options = {}, }) => {
        return await inventory_1.Inventory.findOne({
            where: { orderId },
            ...exports.inventoryRepository.getQueryOptions(transaction, options),
        });
    },
    findByOrderIds: async ({ orderIds, transaction, options = {}, }) => {
        return await inventory_1.Inventory.findAll({
            where: { orderId: { [sequelize_1.Op.in]: orderIds } },
            ...exports.inventoryRepository.getQueryOptions(transaction, options),
        });
    },
    buildMeiliInventoryOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: ["inventoryId", "qtyInventory"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId"],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: user_1.User, attributes: ["fullName"] },
                    ],
                },
            ],
            transaction,
        };
        return queryOptions;
    },
    syncInventoryForMeili: async (orderId, transaction) => {
        return await inventory_1.Inventory.findOne(exports.inventoryRepository.buildMeiliInventoryOptions({ whereCondition: { orderId }, transaction }));
    },
    syncAllInventoryToMeili: async (orderId, transaction) => {
        return await inventory_1.Inventory.findAll(exports.inventoryRepository.buildMeiliInventoryOptions({
            whereCondition: { orderId: { [sequelize_1.Op.in]: orderId } },
            transaction,
        }));
    },
    syncAllInventoryForMeili: async (whereCondition) => {
        return await inventory_1.Inventory.findAll(exports.inventoryRepository.buildMeiliInventoryOptions({ whereCondition }));
    },
    //====================================LIQUIDATION INVENTORY========================================
    getLiquidationInvByPage: async ({ page, pageSize, searching, }) => {
        const whereClause = {
            [sequelize_1.Op.and]: [{ qtyRemaining: { [sequelize_1.Op.gt]: 0 } }],
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
            options.order = [["createdAt", "DESC"]];
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