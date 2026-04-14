"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const labelFields_1 = require("../../assets/labelFields");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const exportPDF_1 = require("../../utils/helper/exportPDF");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const outboundDetail_1 = require("../../models/warehouse/outboundDetail");
const customerRepository_1 = require("../../repository/customerRepository");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const outboundHistory_1 = require("../../models/warehouse/outboundHistory");
const planningHelper_1 = require("../../repository/planning/planningHelper");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const devEnvironment = process.env.NODE_ENV !== "production";
const { outbound } = cacheKey_1.CacheKey.warehouse;
exports.outboundService = {
    getAllOutboundHistory: async (page, pageSize) => {
        try {
            const cacheKey = outbound.page(page);
            const { isChanged } = await cacheManager_1.CacheManager.check(outboundHistory_1.OutboundHistory, "outbound");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("outbound");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data outbound from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all outbound from cache` };
                }
            }
            const { rows, count } = await warehouseRepository_1.warehouseRepository.getOutboundByPage({ page, pageSize });
            const responseData = {
                message: "Get all outbound history successfully",
                data: rows,
                totalOutbounds: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get all outbound history:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getOutboundDetail: async (outboundId) => {
        try {
            if (!outboundId) {
                throw appError_1.AppError.BadRequest("missing parameters", "INVALID_OUTBOUND_ID");
            }
            const outbound = await warehouseRepository_1.warehouseRepository.findByPK(outboundId);
            if (!outbound) {
                throw appError_1.AppError.NotFound("outbound not found", "OUTBOUND_NOT_FOUND");
            }
            const details = await warehouseRepository_1.warehouseRepository.getOutboundDetail(outboundId);
            return { message: "get outbound detail successfully", data: details };
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getOutboundByField: async ({ field, keyword, page, pageSize, }) => {
        try {
            const validFields = ["dateOutbound", "outboundSlipCode", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("outbounds");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["outboundId"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            });
            const outboundIds = searchResult.hits.map((hit) => hit.outboundId);
            if (outboundIds.length === 0) {
                return {
                    message: "No outbound records found",
                    data: [],
                    totalOutbounds: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const { rows } = await warehouseRepository_1.warehouseRepository.getOutboundByPage({
                whereCondition: { outboundId: { [sequelize_1.Op.in]: outboundIds } },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = outboundIds
                .map((id) => rows.find((o) => o.outboundId === id))
                .filter(Boolean);
            return {
                message: "Get outbound records from Meilisearch & DB successfully",
                data: finalData,
                totalOutbounds: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error(`Failed to get outbound history by ${field}:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    //use to auto complete
    searchOrderIds: async (keyword) => {
        try {
            const orders = await warehouseRepository_1.warehouseRepository.searchOrderIds(keyword);
            return { message: "Get orderId suggestions successfully", data: orders };
        }
        catch (error) {
            console.error("Error search orderIds:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //this func use to get planning has qtyProduced > 0
    getOrderInboundQty: async (orderId) => {
        try {
            const order = await warehouseRepository_1.warehouseRepository.getOrderInboundQty(orderId);
            if (!order) {
                throw appError_1.AppError.NotFound("Order not found", "ORDER_NOT_FOUND");
            }
            const inventory = await inventoryRepository_1.inventoryRepository.findInventoryByOrderId(orderId);
            const remainingQty = inventory?.qtyInventory ?? 0;
            return {
                message: "Get all order inbound quantities successfully",
                data: { ...order.toJSON(), remainingQty },
            };
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createOutbound: async ({ outboundDetails, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!outboundDetails || outboundDetails.length === 0) {
                    throw appError_1.AppError.BadRequest("empty order list", "EMPTY_ORDER_LIST");
                }
                let customerId = null;
                let totalPriceOrder = 0;
                let totalPriceVAT = 0;
                let totalPricePayment = 0;
                let totalOutboundQty = 0;
                let timePayment = null;
                const preparedDetails = [];
                for (const item of outboundDetails) {
                    // check order is exist
                    const order = await order_1.Order.findByPk(item.orderId, { transaction });
                    if (!order) {
                        throw appError_1.AppError.NotFound(`Order ${item.orderId} không tồn tại`, "ORDER_NOT_FOUND");
                    }
                    // check customer
                    if (customerId === null) {
                        customerId = order.customerId;
                        const customer = await customerRepository_1.customerRepository.findCusPaymentByPk(customerId, transaction);
                        if (customer && customer.payment) {
                            timePayment = customer.payment.timePayment;
                        }
                    }
                    else if (customerId !== order.customerId) {
                        throw appError_1.AppError.BadRequest("customer missmatch", "CUSTOMER_MISMATCH");
                    }
                    // check inventory
                    const inventory = await inventoryRepository_1.inventoryRepository.findByOrderId({
                        orderId: item.orderId,
                        transaction,
                    });
                    if (!inventory) {
                        throw appError_1.AppError.BadRequest(`Order: ${item.orderId} chưa có tồn kho`, "INVENTORY_NOT_FOUND");
                    }
                    if (inventory.qtyInventory < item.outboundQty) {
                        throw appError_1.AppError.BadRequest(`Xuất vượt tồn kho cho order ${item.orderId}`, "OUTBOUND_EXCEED_INVENTORY");
                    }
                    // check xuất vượt số lượng order
                    const exportedQty = await warehouseRepository_1.warehouseRepository.sumOutboundQty({
                        orderId: item.orderId,
                        transaction,
                    });
                    const deliveredQty = Number(exportedQty ?? 0);
                    //total price for outbound detail
                    const totalPriceOutbound = order.pricePaper * item.outboundQty;
                    // outbound history
                    const vatRate = (order?.vat ?? 0) / 100;
                    const vatAmount = totalPriceOutbound * vatRate;
                    totalPriceOrder += totalPriceOutbound;
                    totalPriceVAT += vatAmount;
                    totalPricePayment += totalPriceOutbound + vatAmount;
                    totalOutboundQty += item.outboundQty;
                    preparedDetails.push({
                        orderId: item.orderId,
                        outboundQty: item.outboundQty,
                        price: order.pricePaper,
                        totalPriceOutbound,
                        deliveredQty,
                    });
                }
                // Generate slip code
                const now = new Date();
                const month = (now.getMonth() + 1).toString().padStart(2, "0");
                const year = now.getFullYear().toString().slice(-2);
                let number = 1;
                const prefix = `XKBH${year}${month}`;
                const lastOutbound = await outboundHistory_1.OutboundHistory.findOne({
                    where: {
                        outboundSlipCode: { [sequelize_1.Op.like]: `${prefix}%` },
                    },
                    order: [["outboundId", "DESC"]],
                    transaction,
                });
                if (lastOutbound && lastOutbound.outboundSlipCode) {
                    const lastCode = lastOutbound.outboundSlipCode;
                    const lastNumberStr = lastCode.replace(prefix, "");
                    const lastNumber = parseInt(lastNumberStr, 10);
                    if (!isNaN(lastNumber)) {
                        number = lastNumber + 1;
                    }
                }
                const slipCode = `${prefix}${number.toString().padStart(4, "0")}`; //XKBH26040001
                // Tạo outbound
                const outbound = await planningHelper_1.planningHelper.createData({
                    model: outboundHistory_1.OutboundHistory,
                    data: {
                        dateOutbound: now,
                        outboundSlipCode: slipCode,
                        totalPriceOrder,
                        totalPriceVAT,
                        totalPricePayment,
                        totalOutboundQty,
                        dueDate: timePayment,
                    },
                    transaction,
                });
                // Tạo outbound detail
                for (const item of preparedDetails) {
                    await planningHelper_1.planningHelper.createData({
                        model: outboundDetail_1.OutboundDetail,
                        data: {
                            outboundId: outbound.outboundId,
                            orderId: item.orderId,
                            outboundQty: item.outboundQty,
                            price: item.price,
                            totalPriceOutbound: item.totalPriceOutbound,
                            deliveredQty: item.deliveredQty,
                        },
                        transaction,
                    });
                    await inventory_1.Inventory.increment({
                        totalQtyOutbound: item.outboundQty,
                        qtyInventory: -item.outboundQty,
                        valueInventory: -(item.outboundQty * item.price),
                    }, {
                        where: { orderId: item.orderId },
                        transaction,
                    });
                }
                //--------------------MEILISEARCH-----------------------
                await exports.outboundService.syncDataOutbound(outbound.outboundId, transaction);
                return outbound;
            });
        }
        catch (error) {
            console.log("err to create outbound: ", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateOutbound: async ({ outboundId, outboundDetails, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!outboundDetails || outboundDetails.length === 0) {
                    throw appError_1.AppError.BadRequest("Danh sách đơn hàng trống", "EMPTY_ORDER_LIST");
                }
                const outbound = await outboundHistory_1.OutboundHistory.findByPk(outboundId, {
                    include: [{ model: outboundDetail_1.OutboundDetail, as: "detail" }],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!outbound) {
                    throw appError_1.AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
                }
                const oldDetails = outbound.detail ?? [];
                const oldDetailMap = new Map();
                for (const detail of oldDetails) {
                    oldDetailMap.set(detail.orderId, detail);
                }
                let customerId = null;
                let timePayment = null;
                let totalPriceOrder = 0;
                let totalPriceVAT = 0;
                let totalPricePayment = 0;
                let totalOutboundQty = 0;
                const handledOrderIds = new Set();
                // UPDATE
                for (const item of outboundDetails) {
                    const order = await order_1.Order.findByPk(item.orderId, { transaction });
                    if (!order) {
                        throw appError_1.AppError.NotFound(`Order ${item.orderId} không tồn tại`, "ORDER_NOT_FOUND");
                    }
                    // check customer
                    if (customerId === null) {
                        customerId = order.customerId;
                        const customer = await customerRepository_1.customerRepository.findCusPaymentByPk(customerId, transaction);
                        if (customer && customer.payment) {
                            timePayment = customer.payment.timePayment;
                        }
                    }
                    else if (customerId !== order.customerId) {
                        throw appError_1.AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
                    }
                    const inventory = await inventoryRepository_1.inventoryRepository.findByOrderId({
                        orderId: item.orderId,
                        transaction,
                    });
                    if (!inventory) {
                        throw appError_1.AppError.BadRequest(`Order ${item.orderId} chưa có tồn kho`, "INVENTORY_NOT_FOUND");
                    }
                    const oldDetail = oldDetailMap.get(item.orderId);
                    const oldQty = oldDetail ? oldDetail.outboundQty : 0;
                    const deltaQty = item.outboundQty - oldQty;
                    // check tồn kho nếu xuất thêm
                    if (deltaQty > 0 && inventory.qtyInventory < deltaQty) {
                        throw appError_1.AppError.BadRequest(`Xuất vượt tồn kho cho order ${item.orderId}`, "OUTBOUND_EXCEED_INVENTORY");
                    }
                    // check vượt số lượng bán
                    const exportedQty = await warehouseRepository_1.warehouseRepository.sumOutboundQtyExcludeOutbound({
                        orderId: item.orderId,
                        outboundId,
                        transaction,
                    });
                    const deliveredQty = Number(exportedQty ?? 0);
                    // cập nhật tồn kho theo delta
                    if (deltaQty !== 0) {
                        await inventory_1.Inventory.increment({
                            totalQtyOutbound: deltaQty,
                            qtyInventory: -deltaQty,
                            valueInventory: -(deltaQty * order.pricePaper),
                        }, { where: { orderId: item.orderId }, transaction });
                    }
                    const totalPriceOutbound = order.pricePaper * item.outboundQty;
                    const vatRate = (order.vat ?? 0) / 100;
                    const vatAmount = totalPriceOutbound * vatRate;
                    totalPriceOrder += totalPriceOutbound;
                    totalPriceVAT += vatAmount;
                    totalPricePayment += totalPriceOutbound + vatAmount;
                    totalOutboundQty += item.outboundQty;
                    if (oldDetail) {
                        // UPDATE
                        await oldDetail.update({
                            outboundQty: item.outboundQty,
                            price: order.pricePaper,
                            totalPriceOutbound,
                        }, { transaction });
                    }
                    else {
                        // ADD
                        await outboundDetail_1.OutboundDetail.create({
                            outboundId,
                            orderId: item.orderId,
                            outboundQty: item.outboundQty,
                            price: order.pricePaper,
                            totalPriceOutbound,
                            deliveredQty,
                        }, { transaction });
                    }
                    handledOrderIds.add(item.orderId);
                }
                // XỬ LÝ DELETE đơn bị xóa khỏi phiếu
                for (const oldDetail of oldDetails) {
                    if (!handledOrderIds.has(oldDetail.orderId)) {
                        // hoàn kho
                        await inventory_1.Inventory.increment({
                            totalQtyOutbound: -oldDetail.outboundQty,
                            qtyInventory: oldDetail.outboundQty,
                            valueInventory: oldDetail.outboundQty * oldDetail.price,
                        }, { where: { orderId: oldDetail.orderId }, transaction });
                        await oldDetail.destroy({ transaction });
                    }
                }
                const finalDueDate = timePayment || outbound.dueDate;
                // Cập nhật outbound header
                await outbound.update({
                    totalPriceOrder,
                    totalPriceVAT,
                    totalPricePayment,
                    totalOutboundQty,
                    dueDate: finalDueDate,
                }, { transaction });
                //--------------------MEILISEARCH-----------------------
                await exports.outboundService.syncDataOutbound(outboundId, transaction);
                return outbound;
            });
        }
        catch (error) {
            console.log("err to update outbound: ", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    syncDataOutbound: async (outboundId, transaction) => {
        try {
            const outboundData = await warehouseRepository_1.warehouseRepository.getOutboundForMeili(outboundId, transaction);
            const meiliFormatted = meiliTransformer_1.meiliTransformer.outbound(outboundData);
            await meiliService_1.meiliService.syncOrUpdateMeiliData({
                indexKey: labelFields_1.MEILI_INDEX.OUTBOUNDS,
                data: meiliFormatted,
                transaction,
            });
        }
        catch (error) {
            console.log("err to sync data outbound: ", error);
            throw appError_1.AppError.ServerError();
        }
    },
    deleteOutbound: async (outboundId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const outbound = await outboundHistory_1.OutboundHistory.findByPk(outboundId, {
                    include: [{ model: outboundDetail_1.OutboundDetail, as: "detail" }],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!outbound) {
                    throw appError_1.AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
                }
                const details = outbound.detail ?? [];
                // Hoàn kho cho từng order
                for (const detail of details) {
                    await inventory_1.Inventory.increment({
                        totalQtyOutbound: -detail.outboundQty,
                        qtyInventory: detail.outboundQty,
                        valueInventory: detail.outboundQty * detail.price,
                    }, {
                        where: { orderId: detail.orderId },
                        transaction,
                    });
                }
                // Xóa outbound detail
                await outboundDetail_1.OutboundDetail.destroy({
                    where: { outboundId },
                    transaction,
                });
                // Xóa outbound history
                await outbound.destroy({ transaction });
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.deleteMeiliData(labelFields_1.MEILI_INDEX.OUTBOUNDS, outboundId, transaction);
                return { message: "Hủy phiếu xuất kho thành công" };
            });
        }
        catch (error) {
            console.log("err to delete outbound: ", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportFileOutbound: async (res, outboundId) => {
        try {
            await (0, exportPDF_1.exportWarehouse)(res, outboundId);
        }
        catch (error) {
            console.error("Error export file outbound:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=outboundService.js.map