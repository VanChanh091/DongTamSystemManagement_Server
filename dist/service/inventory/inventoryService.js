"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const user_1 = require("../../models/user/user");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const labelFields_1 = require("../../assets/labelFields");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const inventoryTransfers_1 = require("../../models/warehouse/inventory/inventoryTransfers");
const liquidationInventory_1 = require("../../models/warehouse/inventory/liquidationInventory");
const inventoryRowAndColumn_1 = require("../../utils/mapping/warehouse/inventoryRowAndColumn");
const inventoryLogService_1 = require("./inventoryLogService");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory_gt, inventory_lt } = cacheKey_1.CacheKey.warehouse;
exports.inventoryService = {
    getAllInventory: async (page, pageSize, filter) => {
        const cacheKey = filter === "gtZero" ? inventory_gt.page(page) : inventory_lt.page(page);
        const cachName = filter === "gtZero" ? "inventory_gt" : "inventory_lt";
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inventory_1.Inventory, cachName);
            if (isChanged) {
                await cacheManager_1.CacheManager.clear(cachName);
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data inventory from Redis");
                    return { ...JSON.parse(cachedData), message: `Get all inventory from cache` };
                }
            }
            const options = inventoryRepository_1.inventoryRepository.buildInventoryOptions({ page, pageSize, filter });
            const { rows, count } = await inventory_1.Inventory.findAndCountAll(options);
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
    getInventoryByField: async ({ field, keyword, page, pageSize, filter }) => {
        try {
            const validFields = ["orderId", "customerName", "fullName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("inventories");
            const filterCondition = filter === "gtZero" ? "qtyInventory > 0" : "qtyInventory < 0";
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["inventoryId"],
                filter: filterCondition,
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
            const options = inventoryRepository_1.inventoryRepository.buildInventoryOptions({
                searching: { inventoryId: { [sequelize_1.Op.in]: inventoryIds } },
                filter: filter,
            });
            const { rows } = await inventory_1.Inventory.findAndCountAll(options);
            const totals = await inventoryRepository_1.inventoryRepository.inventoryTotals({
                inventoryId: { [sequelize_1.Op.in]: rows.map((inv) => inv.inventoryId) },
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
                totalValueInventory: totals?.totalValueInventory || 0,
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
            const existedInventory = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
                orderId,
                transaction,
                options: { lock: transaction?.LOCK.UPDATE },
            });
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
    transferOrderQty: async (req, data) => {
        const { sourceOrderId, targetOrderId, qtyTransfer, reason } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Tìm và Check tồn
                const sourceInv = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
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
                const order = await inventoryRepository_1.inventoryRepository.getTargetOrder(targetOrderId, transaction);
                if (!order) {
                    throw appError_1.AppError.NotFound(`Target order with orderId ${targetOrderId} not found`, "TARGET_ORDER_NOT_FOUND");
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
                // Xử lý cộng kho đích
                let targetInv = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
                    orderId: targetOrderId,
                    transaction,
                    options: { lock: transaction.LOCK.UPDATE },
                });
                let newQtyTarget = 0;
                if (targetInv) {
                    newQtyTarget = targetInv.qtyInventory + qtyTransfer;
                    const newValueTarget = newQtyTarget > 0 ? newQtyTarget * unitPrice : 0;
                    const valueDeltaTarget = newValueTarget - targetInv.valueInventory;
                    await targetInv.increment({ qtyInventory: qtyTransfer, valueInventory: valueDeltaTarget }, { transaction });
                }
                else {
                    newQtyTarget = qtyTransfer;
                    targetInv = await inventory_1.Inventory.create({
                        orderId: targetOrderId,
                        qtyInventory: qtyTransfer,
                        valueInventory: addedValue,
                    }, { transaction });
                }
                //trừ số lượng đã chuyển giao khỏi quantityManufacture của đơn hàng
                const newQtyManufacture = Math.max(0, order.quantityManufacture - qtyTransfer);
                let newStatus = order.status;
                if (newQtyManufacture == 0)
                    newStatus = "planning";
                await order.update({ quantityManufacture: newQtyManufacture, status: newStatus }, { transaction });
                // Lấy tên người dùng để ghi log
                const userName = await user_1.User.findOne({ where: { userId: req.user.userId }, transaction });
                // Ghi log chuyển kho
                await inventoryTransfers_1.InventoryTransfers.create({
                    sourceId: sourceOrderId,
                    targetId: targetOrderId,
                    qtyTransfers: qtyTransfer,
                    reason,
                    transferBy: userName?.fullName,
                    inventoryId: sourceInv.inventoryId,
                }, { transaction });
                //inventory logs
                await inventoryLogService_1.inventoryLogService.followInventoryChange({
                    items: [
                        { inventoryId: sourceInv.inventoryId, changeQty: -qtyTransfer },
                        { inventoryId: targetInv?.inventoryId || 0, changeQty: qtyTransfer },
                    ],
                    type: "TRANSFER",
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                //  Xử lý Source Inventory
                if (remainingQty === 0) {
                    // bằng 0 -> Xóa khỏi Meilisearch
                    await meiliService_1.meiliService.deleteMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                        idOrIds: sourceInv.inventoryId,
                        transaction,
                    });
                }
                else {
                    // Vẫn khác 0 -> Cập nhật lại số lượng
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                        data: {
                            inventoryId: sourceInv.inventoryId,
                            qtyInventory: sourceInv.qtyInventory,
                        },
                        transaction,
                        isUpdate: true,
                    });
                }
                // Xử lý Target Inventory:
                if (newQtyTarget === 0) {
                    const targetFullInvs = await inventoryRepository_1.inventoryRepository.syncInventoryForMeili(targetOrderId, transaction);
                    if (!targetFullInvs) {
                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                            indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                            data: targetFullInvs,
                            transaction,
                        });
                    }
                }
                else {
                    // Nếu sau khi cộng mà bù vừa khớp về đúng 0 -> Xóa khỏi Meilisearch
                    await meiliService_1.meiliService.deleteMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                        idOrIds: targetInv.inventoryId,
                        transaction,
                    });
                }
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
                // Check đủ số lượng để chuyển giao không
                if (inventory.qtyInventory < qtyTransfer) {
                    throw appError_1.AppError.BadRequest(`Insufficient quantity in inventory`, "INSUFFICIENT_QUANTITY");
                }
                //tính giá trị chuyển đổi
                const transferValue = Math.round((inventory.valueInventory / inventory.qtyInventory) * qtyTransfer);
                const remainingQty = inventory.qtyInventory - qtyTransfer;
                await inventory.update({
                    valueInventory: remainingQty,
                    qtyInventory: inventory.qtyInventory - qtyTransfer,
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
                //inventory logs
                await inventoryLogService_1.inventoryLogService.followInventoryChange({
                    items: [{ inventoryId: inventory.inventoryId, changeQty: -qtyTransfer }],
                    type: "LIQUIDATION",
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                if (remainingQty === 0) {
                    // Hết tồn kho do thanh lý toàn bộ
                    await meiliService_1.meiliService.deleteMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                        idOrIds: inventory.inventoryId,
                        transaction,
                    });
                }
                else {
                    // Vẫn còn tồn kho một phầ
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                        data: { inventoryId: inventory.inventoryId, qtyInventory: remainingQty },
                        transaction,
                        isUpdate: true,
                    });
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
    transferToQtyVariance: async ({ inventoryIds }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const inventories = await inventory_1.Inventory.findAll({
                    where: { inventoryId: { [sequelize_1.Op.in]: inventoryIds } },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (inventories.length === 0) {
                    throw appError_1.AppError.NotFound("Inventory not found", "INVENTORY_NOT_FOUND");
                }
                const uniqueInventoryIds = [...new Set(inventories.map((inv) => inv.inventoryId))];
                const qtyVariance = inventories.reduce((total, inv) => total + inv.qtyInventory, 0);
                await inventory_1.Inventory.update({
                    qtyVariance: qtyVariance,
                    qtyInventory: 0,
                    valueInventory: 0,
                }, { where: { inventoryId: { [sequelize_1.Op.in]: uniqueInventoryIds } }, transaction });
                //inventory logs
                await inventoryLogService_1.inventoryLogService.followInventoryChange({
                    items: uniqueInventoryIds.map((id) => ({ inventoryId: id, changeQty: qtyVariance })),
                    type: "ADJUSTMENT",
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.deleteMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                    idOrIds: uniqueInventoryIds,
                    transaction,
                });
                return { message: "Transfer quantity to variance successfully" };
            });
        }
        catch (error) {
            console.log("err to transfer qty to liquidation inventory: ", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelInventory: async (res, userName, date) => {
        try {
            let whereCondition = {};
            if (date) {
                const dateTimestamp = (0, dayjs_config_1.dayjsUtc)(date).startOf("day").toDate();
                // console.log(`date: ${date}`);
                // console.log(`dateTimestamp: ${dateTimestamp}`);
                whereCondition.dateInbound = { [sequelize_1.Op.lt]: dateTimestamp };
            }
            const baseQuery = inventoryRepository_1.inventoryRepository.buildInventoryOptions({
                isExport: true,
                searching: whereCondition,
            });
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: inventory_1.Inventory,
                sheetName: "Tồn Kho",
                fileName: "inventory",
                columns: inventoryRowAndColumn_1.inventoryColumns,
                rows: inventoryRowAndColumn_1.mappingInventoryRow,
                userName,
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