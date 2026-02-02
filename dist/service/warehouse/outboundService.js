"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cacheManager_1 = require("../../utils/helper/cacheManager");
const appError_1 = require("../../utils/appError");
const outboundHistory_1 = require("../../models/warehouse/outboundHistory");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const outboundDetail_1 = require("../../models/warehouse/outboundDetail");
const order_1 = require("../../models/order/order");
const planningRepository_1 = require("../../repository/planningRepository");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const inventory_1 = require("../../models/warehouse/inventory");
const exportPDF_1 = require("../../utils/helper/exportPDF");
const devEnvironment = process.env.NODE_ENV !== "production";
const { outbound } = cacheManager_1.CacheManager.keys.warehouse;
exports.outboundService = {
    getAllOutboundHistory: async (page, pageSize) => {
        try {
            const cacheKey = outbound.page(page);
            const { isChanged } = await cacheManager_1.CacheManager.check(outboundHistory_1.OutboundHistory, "outbound");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearOutbound();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data outbound from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all outbound from cache` };
                }
            }
            const totalOutbounds = await warehouseRepository_1.warehouseRepository.outboundHistoryCount();
            const totalPages = Math.ceil(totalOutbounds / pageSize);
            const data = await warehouseRepository_1.warehouseRepository.getOutboundByPage({ page, pageSize });
            const responseData = {
                message: "Get all outbound history successfully",
                data,
                totalOutbounds,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
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
            const inventory = await warehouseRepository_1.warehouseRepository.findInventoryByOrderId(orderId);
            const remainingQty = inventory?.qtyInventory ?? 0;
            return {
                message: "Get all employee by position sucessfully",
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
                    }
                    else if (customerId !== order.customerId) {
                        throw appError_1.AppError.BadRequest("customer missmatch", "CUSTOMER_MISMATCH");
                    }
                    // check inventory
                    const inventory = await warehouseRepository_1.warehouseRepository.findByOrderId({
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
                    if (deliveredQty + item.outboundQty > order.quantityCustomer) {
                        throw appError_1.AppError.BadRequest(`Xuất vượt số lượng bán cho order ${item.orderId}`, "OUTBOUND_QTY_EXCEED");
                    }
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
                const slipCode = `XK${now.getDate()}${now.getMonth() + 1}${now
                    .getFullYear()
                    .toString()
                    .slice(-2)}`;
                // Tạo outbound
                const outbound = await planningRepository_1.planningRepository.createData({
                    model: outboundHistory_1.OutboundHistory,
                    data: {
                        dateOutbound: now,
                        outboundSlipCode: slipCode,
                        totalPriceOrder,
                        totalPriceVAT,
                        totalPricePayment,
                        totalOutboundQty,
                    },
                    transaction,
                });
                // Tạo outbound detail
                for (const item of preparedDetails) {
                    await planningRepository_1.planningRepository.createData({
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
                    }
                    else if (customerId !== order.customerId) {
                        throw appError_1.AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
                    }
                    const inventory = await warehouseRepository_1.warehouseRepository.findByOrderId({
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
                    if (deliveredQty + item.outboundQty > order.quantityCustomer) {
                        throw appError_1.AppError.BadRequest(`Xuất vượt số lượng bán cho order ${item.orderId}`, "OUTBOUND_QTY_EXCEED");
                    }
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
                // 4️⃣ Cập nhật outbound header
                await outbound.update({
                    totalPriceOrder,
                    totalPriceVAT,
                    totalPricePayment,
                    totalOutboundQty,
                }, { transaction });
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
    searchOutboundByField: async ({ field, keyword, page, pageSize, }) => {
        try {
            // const fieldMap = {
            //   orderId: (outbound: OutboundHistory) => outbound.detail.orderId,
            //   outboundSlipCode: (outbound: OutboundHistory) => outbound.outboundSlipCode,
            //   dateOutbound: (outbound: OutboundHistory) => outbound.dateOutbound,
            //   companyName: (outbound: OutboundHistory) =>
            //     outbound.outboundDetail.Order.Customer.companyName,
            //   productName: (outbound: OutboundHistory) =>
            //     outbound.outboundDetail.Order.Product.productName,
            // } as const;
            // const key = field as keyof typeof fieldMap;
            // if (!fieldMap[key]) {
            //   throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            // }
            // const result = await getOutboundByField({
            //   keyword: keyword,
            //   getFieldValue: fieldMap[key],
            //   page,
            //   pageSize,
            //   message: `get all by ${field} from filtered cache`,
            // });
            // return result;
        }
        catch (error) {
            console.error(`Failed to get outbound history by ${field}:`, error);
            throw appError_1.AppError.ServerError();
        }
    },
    exportFileOutbound: async (res, outboundId) => {
        try {
            await (0, exportPDF_1.exportWarehouseSale)(res, outboundId);
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