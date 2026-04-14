"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../../utils/appError");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const inventoryRowAndColumn_1 = require("../../utils/mapping/inventoryRowAndColumn");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const order_1 = require("../../models/order/order");
const liquidationInventory_1 = require("../../models/warehouse/inventory/liquidationInventory");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory } = cacheKey_1.CacheKey.warehouse;
exports.inventoryService = {
    getAllInventory: async (page, pageSize) => {
        const cacheKey = inventory.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inventory_1.Inventory, "inventory");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("inventory");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data inventory from Redis");
                    return { ...JSON.parse(cachedData), message: `Get all inventory from cache` };
                }
            }
            const { rows, count } = await inventoryRepository_1.inventoryRepository.getInventoryByPage({ page, pageSize });
            const totals = await inventoryRepository_1.inventoryRepository.inventoryTotals();
            const responseData = {
                message: "Get all inventory successfully",
                data: rows,
                totalInventory: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
                totalValueInventory: totals?.totalValueInventory || 0,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get inventory:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getInventoryByField: async ({ field, keyword, page, pageSize }) => {
        try {
            const validFields = ["orderId", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("inventories");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["inventoryId"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            });
            const inventoryIds = searchResult.hits.map((hit) => hit.inventoryId);
            if (inventoryIds.length === 0) {
                return {
                    message: "No inventories found",
                    data: [],
                    totalInventory: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const { rows } = await inventoryRepository_1.inventoryRepository.getInventoryByPage({
                searching: { inventoryId: { [sequelize_1.Op.in]: inventoryIds } },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = inventoryIds
                .map((id) => rows.find((inventory) => inventory.inventoryId === id))
                .filter(Boolean);
            return {
                message: "Get customers from Meilisearch & DB successfully",
                data: finalData,
                totalInventory: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error("Failed to get inventory:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createNewInventory: async (orderId, transaction) => {
        try {
            if (!orderId) {
                throw appError_1.AppError.BadRequest("Missing orderId", "MISSING_ORDER_ID");
            }
            const existedInventory = await inventoryRepository_1.inventoryRepository.findByOrderId({ orderId, transaction });
            if (existedInventory) {
                return existedInventory;
            }
            return await inventory_1.Inventory.create({ orderId }, { transaction });
        }
        catch (error) {
            console.error("Failed to create inventory:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    transferOrderQty: async (data) => {
        const { sourceOrderId, targetOrderId, qtyTransfer } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Tìm và Check tồn
                const sourceInv = await inventoryRepository_1.inventoryRepository.findByOrderId({
                    orderId: sourceOrderId,
                    transaction,
                    options: {
                        include: [
                            {
                                model: order_1.Order,
                                attributes: ["flute", "pricePaper", "lengthPaperCustomer", "paperSizeCustomer"],
                            },
                        ],
                    },
                });
                if (!sourceInv) {
                    throw appError_1.AppError.NotFound(`Source inventory with orderId ${sourceOrderId} not found`, "SOURCE_INVENTORY_NOT_FOUND");
                }
                // Check đủ số lượng để chuyển giao không
                if (sourceInv.qtyInventory < qtyTransfer) {
                    throw appError_1.AppError.BadRequest(`Insufficient quantity in source inventory`, "INSUFFICIENT_QUANTITY");
                }
                //Lấy thông tin đơn hàng đích để có giá tấm
                const order = await order_1.Order.findOne({
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
                if (!order) {
                    throw appError_1.AppError.NotFound(`Target order with orderId ${targetOrderId} not found`, "TARGET_ORDER_NOT_FOUND");
                }
                const isSpecsMatch = sourceInv.Order.flute === order.flute &&
                    sourceInv.Order.lengthPaperCustomer === order.lengthPaperCustomer &&
                    sourceInv.Order.paperSizeCustomer === order.paperSizeCustomer;
                if (!isSpecsMatch) {
                    throw appError_1.AppError.BadRequest("Thông số kỹ thuật không khớp!", "SPECIFICATIONS_MISMATCH");
                }
                //xử lý cho đơn hàng nguồn
                const sourcePrice = sourceInv.Order.pricePaper || 0;
                const remainingQty = sourceInv.qtyInventory - qtyTransfer;
                const newValueSource = remainingQty > 0 ? remainingQty * sourcePrice : 0;
                const valuePriceSource = sourceInv.valueInventory - newValueSource;
                //xử lý cho đơn đích
                const unitPrice = order.pricePaper || 0;
                const addedValue = qtyTransfer * unitPrice;
                await sourceInv.decrement({ qtyInventory: qtyTransfer, valueInventory: valuePriceSource }, { transaction });
                await sourceInv.reload({ transaction });
                // if (sourceInv.qtyInventory <= 0) {
                //   await sourceInv.destroy({ transaction });
                // }
                // Xử lý cộng kho đích
                const targetInv = await inventoryRepository_1.inventoryRepository.findByOrderId({
                    orderId: targetOrderId,
                    transaction,
                });
                if (targetInv) {
                    // Đã có record: Tăng cả lượng và tổng giá trị
                    await targetInv.increment({ qtyInventory: qtyTransfer, valueInventory: addedValue }, { transaction });
                }
                else {
                    await inventory_1.Inventory.create({
                        orderId: targetOrderId,
                        qtyInventory: qtyTransfer,
                        valueInventory: addedValue,
                    }, { transaction });
                }
                //check đã đủ số lượng cho đơn hàng chưa để chuyển trạng thái đơn hàng
                const totalInventory = await inventory_1.Inventory.sum("qtyInventory", {
                    where: { orderId: targetOrderId },
                    transaction,
                });
                let newStatus = order.status;
                if (totalInventory >= order.quantityCustomer) {
                    newStatus = "planning";
                }
                //trừ số lượng đã chuyển giao khỏi quantityManufacture của đơn hàng
                const newQtyManufacture = Math.max(0, order.quantityManufacture - qtyTransfer);
                await order.update({ quantityManufacture: newQtyManufacture, status: newStatus }, { transaction });
                return {
                    message: "Transfer quantity successfully",
                    remainingQtyManufacture: newQtyManufacture,
                    status: newStatus,
                };
            });
        }
        catch (error) {
            console.log("err to transfer qty: ", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    transferQtyToLiquidationInv: async ({ inventoryId, qtyTransfer, reason, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const inventory = await inventory_1.Inventory.findOne({
                    where: { inventoryId },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!inventory) {
                    throw appError_1.AppError.NotFound(`Inventory with id ${inventoryId} not found`, "INVENTORY_NOT_FOUND");
                }
                if (inventory.qtyInventory < qtyTransfer) {
                    throw appError_1.AppError.BadRequest(`Insufficient quantity in inventory`, "INSUFFICIENT_QUANTITY");
                }
                //tính giá trị chuyển đổi
                const transferValue = Math.round((inventory.valueInventory / inventory.qtyInventory) * qtyTransfer);
                await inventory.update({
                    qtyInventory: inventory.qtyInventory - qtyTransfer,
                    totalQtyOutbound: inventory.totalQtyOutbound + qtyTransfer,
                    valueInventory: inventory.valueInventory - transferValue,
                }, { transaction });
                const liquidationInv = await liquidationInventory_1.LiquidationInventory.findOne({
                    where: { inventoryId },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (liquidationInv) {
                    await liquidationInv.increment({
                        qtyTransferred: qtyTransfer,
                        qtyRemaining: qtyTransfer,
                        liquidationValue: transferValue,
                    }, { transaction });
                }
                else {
                    await liquidationInventory_1.LiquidationInventory.create({
                        qtyTransferred: qtyTransfer,
                        qtyRemaining: qtyTransfer,
                        liquidationValue: transferValue,
                        reason,
                        inventoryId,
                        orderId: inventory.orderId,
                    }, { transaction });
                }
                return { message: "Transfer quantity to liquidation inventory successfully" };
            });
        }
        catch (error) {
            console.log("err to transfer qty to liquidation inventory: ", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelInventory: async (res) => {
        try {
            const { rows } = await inventoryRepository_1.inventoryRepository.getInventoryByPage({});
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: rows,
                sheetName: "Tồn Kho",
                fileName: "inventory",
                columns: inventoryRowAndColumn_1.inventoryColumns,
                rows: inventoryRowAndColumn_1.mappingInventoryRow,
            });
        }
        catch (error) {
            console.error("Error create inventory:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=inventoryService.js.map