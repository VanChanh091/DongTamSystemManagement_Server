"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryLogService = void 0;
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const sequelize_1 = require("sequelize");
const product_1 = require("../../models/product/product");
const customer_1 = require("../../models/customer/customer");
const inventoryLog_1 = require("../../models/warehouse/inventory/inventoryLog");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const inventoryRowAndColumn_1 = require("../../utils/mapping/warehouse/inventoryRowAndColumn");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
exports.inventoryLogService = {
    migrateInitialInventoryLogs: async () => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const hasLog = await inventoryLog_1.InventoryLog.findOne({ type: "INITIAL", transaction });
                if (hasLog) {
                    throw appError_1.AppError.BadRequest("Initial inventory logs already exist", "INITIAL_LOGS_EXIST");
                }
                const inventories = await inventory_1.Inventory.findAll({
                    where: { qtyInventory: { [sequelize_1.Op.ne]: 0 } },
                    transaction,
                });
                if (inventories.length === 0) {
                    throw appError_1.AppError.NotFound("No inventories found to migrate", "NO_INVENTORIES");
                }
                const initialLogs = inventories.map((inv) => ({
                    inventoryId: inv.inventoryId,
                    orderId: inv.orderId,
                    changeQty: inv.qtyInventory,
                    balanceAfter: inv.qtyInventory,
                    valueAfter: inv.valueInventory,
                    createdAt: inv.updatedAt,
                    updatedAt: inv.updatedAt,
                    type: "INITIAL",
                }));
                await inventoryLog_1.InventoryLog.bulkCreate(initialLogs, { transaction });
                return { message: "Initial inventory logs migrated successfully" };
            });
        }
        catch (error) {
            console.error("Failed to migrate initial inventory logs:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    followInventoryChange: async ({ items, type, transaction, }) => {
        try {
            const inventoryIds = items.map((item) => item.inventoryId);
            const inventories = await inventory_1.Inventory.findAll({
                where: { inventoryId: { [sequelize_1.Op.in]: inventoryIds } },
                transaction,
            });
            if (inventories.length === 0) {
                throw appError_1.AppError.NotFound("Inventory not found", "INVENTORY_NOT_FOUND");
            }
            const inventoryMap = new Map(inventories.map((inv) => [inv.inventoryId, inv]));
            const logsToCreate = [];
            for (const item of items) {
                const inv = inventoryMap.get(item.inventoryId);
                if (!inv)
                    continue;
                logsToCreate.push({
                    inventoryId: inv.inventoryId,
                    orderId: inv.orderId,
                    changeQty: item.changeQty, // Lượng biến động do logic bên ngoài truyền vào
                    balanceAfter: inv.qtyInventory, // Bốc luôn số lượng sau update của bảng chính
                    valueAfter: inv.valueInventory, // Bốc luôn giá trị sau update của bảng chính (đã bằng 0 nếu âm)
                    type,
                });
            }
            await inventoryLog_1.InventoryLog.bulkCreate(logsToCreate, { transaction });
            return { message: "Inventory change logged successfully" };
        }
        catch (error) {
            console.error("Failed to handle inventory change:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportInventoryByDate: async (res, userName, targetDate) => {
        try {
            // const endDate = dayjsUtc.utc(targetDate).format("YYYY-MM-DD 23:59:59");
            // const dateTimestamp = dayjsUtc(targetDate).endOf("day").toDate();
            // const dateTimestamp = dayjsUtc(targetDate).toDate();
            const dateTimestamp = (0, dayjs_config_1.dayjsUtc)(targetDate).format("YYYY-MM-DD HH:mm:ss");
            const baseQuery = {
                where: {
                    inventoryLogId: {
                        [sequelize_1.Op.in]: (0, sequelize_1.literal)(`(
            SELECT MAX(sub_logs.inventoryLogId)
            FROM inventory_logs AS sub_logs
            WHERE sub_logs.createdAt <= :targetDate
            GROUP BY sub_logs.inventoryId
          )`),
                    },
                    balanceAfter: { [sequelize_1.Op.gt]: 0 },
                },
                attributes: ["inventoryId", "orderId", "balanceAfter", "valueAfter", "createdAt"],
                replacements: { targetDate: dateTimestamp },
                order: [["inventoryId", "ASC"]],
                include: [
                    {
                        model: inventory_1.Inventory,
                        attributes: ["inventoryId", "orderId", "totalQtyInbound", "totalQtyOutbound"],
                    },
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
                            "paperSizeManufacture",
                            "lengthPaperManufacture",
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
            const formattedDate = dayjs_config_1.dayjsUtc.utc(dateTimestamp).format("YYYY-MM-DD");
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: inventoryLog_1.InventoryLog,
                sheetName: `Chốt Tồn Kho`,
                fileName: `inventory_${formattedDate}`,
                columns: inventoryRowAndColumn_1.inventoryColumns,
                rows: inventoryRowAndColumn_1.mappingInventoryRow,
                userName,
                includeDate: false,
            });
        }
        catch (error) {
            console.error("Failed to get inventory logs by date:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=inventoryLogService.js.map