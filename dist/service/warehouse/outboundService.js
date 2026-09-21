"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const meiliService_1 = require("../system/meiliService");
const labelFields_1 = require("../../assets/labelFields");
const product_1 = require("../../models/product/product");
const customer_1 = require("../../models/customer/customer");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const exportPDF_1 = require("../../utils/helper/exportPDF");
const deliveryItem_1 = require("../../models/delivery/deliveryItem");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const outboundDetail_1 = require("../../models/warehouse/outbound/outboundDetail");
const outboundHistory_1 = require("../../models/warehouse/outbound/outboundHistory");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const outboundDetailRowAndColumn_1 = require("../../utils/mapping/outboundDetailRowAndColumn");
const inventoryLogService_1 = require("../inventory/inventoryLogService");
const warehouseHelper_1 = require("../../utils/helper/modelHelper/warehouseHelper");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { outbound } = cacheKey_1.CacheKey.warehouse;
exports.outboundService = {
    getAllOutboundHistory: async (page, pageSize) => {
        try {
            const cacheKey = outbound.page(page);
            const globalGrandTotalKey = "outbound:grand_total";
            const { isChanged } = await cacheManager_1.CacheManager.check(outboundHistory_1.OutboundHistory, "outbound");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("outbound");
                await redis_connect_1.default.del(globalGrandTotalKey);
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
            //tính tổng tiền theo ngày
            const totalPriceByDate = await (0, warehouseHelper_1.calculateTotalPriceByDate)(rows);
            //tính tổng 3 cột tiền
            let grandTotal = null;
            const cachedGrandTotal = await redis_connect_1.default.get(globalGrandTotalKey);
            if (cachedGrandTotal) {
                grandTotal = JSON.parse(cachedGrandTotal);
            }
            else {
                grandTotal = await (0, warehouseHelper_1.calculateGrandTotal)();
                await redis_connect_1.default.set(globalGrandTotalKey, JSON.stringify(grandTotal), "EX", 3600);
            }
            const responseData = {
                message: "Get all outbound history successfully",
                data: rows,
                totalOutbounds: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
                totalPriceByDate,
                grandTotal,
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
    getOutboundByField: async ({ field, keyword, page, pageSize, startDate, endDate, }) => {
        try {
            const validFields = ["dateOutbound", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("outbounds");
            let searchKeyword = keyword;
            let filter = [];
            if (field === "dateOutbound") {
                searchKeyword = "";
                if (startDate && endDate) {
                    const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").unix();
                    filter.push(`dateOutbound >= ${startTimestamp}`);
                    const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").unix();
                    filter.push(`dateOutbound <= ${endTimestamp}`);
                }
                // console.log(`start: ${startDate} - end: ${endDate}`);
                // console.log(`filter: ${filter.join(" AND ")}`);
            }
            const searchOptions = {
                filter: filter.join(" AND "),
                attributesToSearchOn: searchKeyword ? [field] : [],
                attributesToRetrieve: ["outboundId"],
                sort: ["outboundId:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            };
            const searchResult = await index.search(searchKeyword, searchOptions);
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
            //total price by date
            const searchWhereCondition = await (0, warehouseHelper_1.buildSearchWhereCondition)(field, keyword, startDate, endDate);
            // console.log("condition:", searchWhereCondition);
            //dùng bộ lọc chung đó vào cho để tự tính toán độc lập
            const totalPriceByDate = await (0, warehouseHelper_1.calculateTotalPriceByDate)(finalData, searchWhereCondition);
            const grandTotal = await (0, warehouseHelper_1.calculateGrandTotal)(searchWhereCondition);
            return {
                message: "Get outbound records from Meilisearch & DB successfully",
                data: finalData,
                totalOutbounds: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
                totalPriceByDate,
                grandTotal,
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
            const totalOutbound = inventory?.totalQtyOutbound ?? 0;
            return {
                message: "Get all order inbound quantities successfully",
                data: { ...order.toJSON(), remainingQty, totalOutbound },
            };
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createOutbound: async ({ outboundBy, outboundDetails, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!outboundDetails || outboundDetails.length === 0) {
                    throw appError_1.AppError.BadRequest("Phải chọn ít nhất 1 đơn hàng", "EMPTY_ORDER_LIST");
                }
                // Dùng Map để theo dõi và cập nhật tồn kho lũy kế của từng orderId trong vòng lặp
                let inventoryMap = new Map();
                const orderIds = outboundDetails.map((d) => d.orderId);
                //map inventory lại để query 1 lần
                const allInventories = await inventory_1.Inventory.findAll({
                    where: { orderId: orderIds },
                    attributes: ["orderId", "inventoryId", "qtyInventory", "totalQtyOutbound"],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                inventoryMap = new Map(allInventories.map((inv) => [inv.orderId, inv]));
                //map các order lại để query 1 lần
                const allOrders = await order_1.Order.findAll({
                    where: { orderId: { [sequelize_1.Op.in]: orderIds } },
                    include: [{ model: product_1.Product, attributes: ["typeProduct"] }],
                    transaction,
                });
                const orderMap = new Map(allOrders.map((o) => [o.orderId, o]));
                let customerId = null;
                let totalPriceOrder = 0;
                let totalPriceVAT = 0;
                let totalPricePayment = 0;
                let totalOutboundQty = 0;
                const preparedDetails = [];
                for (const item of outboundDetails) {
                    // check order is exist
                    const order = orderMap.get(item.orderId);
                    if (!order) {
                        throw appError_1.AppError.NotFound(`Order ${item.orderId} không tồn tại`, "ORDER_NOT_FOUND");
                    }
                    if (order.Product?.typeProduct !== "Phí Khác") {
                        const prefix = item.orderId.slice(0, -3); // Lấy cụm phía trước chữ D
                        const feeOrders = await order_1.Order.findAll({
                            where: { orderId: { [sequelize_1.Op.like]: `${prefix}%` } },
                            attributes: ["orderId"],
                            include: { model: product_1.Product, required: true, where: { typeProduct: "Phí Khác" } },
                            transaction,
                        });
                        for (const feeOrder of feeOrders) {
                            // Kiểm tra xem mã này đã nằm trong danh sách đang tích chọn xuất kho hay chưa
                            const isFeeIncluded = outboundDetails.some((detail) => detail.orderId === feeOrder.orderId);
                            if (!isFeeIncluded) {
                                const feeInventory = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
                                    orderId: feeOrder.orderId,
                                    transaction,
                                });
                                if (feeInventory && feeInventory.qtyInventory >= 1) {
                                    throw appError_1.AppError.BadRequest(`Mã đơn này có phí khác chưa được xuất kèm theo: ${feeOrder.orderId} `, "FEE_ORDER_NOT_INCLUDED");
                                }
                            }
                        }
                    }
                    // check customer
                    if (customerId === null) {
                        customerId = order.customerId;
                    }
                    else if (customerId !== order.customerId) {
                        throw appError_1.AppError.BadRequest("Các đơn hàng không cùng khách hàng", "CUSTOMER_MISMATCH");
                    }
                    let inventory = inventoryMap.get(item.orderId);
                    if (!inventory) {
                        throw appError_1.AppError.BadRequest(`Order: ${item.orderId} chưa có tồn kho`, "INVENTORY_NOT_FOUND");
                    }
                    //calculate price
                    const isPromotion = !!item.isPromotion;
                    const price = isPromotion ? 0 : order.pricePaper;
                    const totalPriceOutbound = price * item.outboundQty;
                    const vatRate = isPromotion ? 0 : (order?.vat ?? 0) / 100;
                    const vatAmount = totalPriceOutbound * vatRate;
                    const exportedQty = await warehouseRepository_1.warehouseRepository.sumOutboundQty(item.orderId, transaction);
                    totalPriceOrder += totalPriceOutbound;
                    totalPriceVAT += vatAmount;
                    totalPricePayment += totalPriceOutbound + vatAmount;
                    totalOutboundQty += item.outboundQty;
                    preparedDetails.push({
                        orderId: item.orderId,
                        outboundQty: item.outboundQty,
                        price,
                        totalPriceOutbound,
                        deliveredQty: Number(exportedQty ?? 0),
                        deliveryItemId: item.deliveryItemId,
                        isPromotion,
                        currentQtyInventory: inventory.qtyInventory,
                        currentTotalQtyOutbound: inventory.totalQtyOutbound,
                    });
                    inventory.qtyInventory -= item.outboundQty;
                    inventory.totalQtyOutbound += item.outboundQty;
                }
                // Generate slip code
                const now = new Date();
                const month = (now.getMonth() + 1).toString().padStart(2, "0");
                const year = now.getFullYear().toString().slice(-2);
                const prefix = `XKBH${year}${month}`;
                //index chỉ có tác dụng với like có dấu % ở cuối
                const lastOutbound = await outboundHistory_1.OutboundHistory.findOne({
                    where: { outboundSlipCode: { [sequelize_1.Op.like]: `${prefix}%` } },
                    order: [["outboundSlipCode", "DESC"]],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                let number = 1;
                if (lastOutbound && lastOutbound.outboundSlipCode) {
                    const lastCode = lastOutbound.outboundSlipCode;
                    const lastNumberStr = lastCode.replace(prefix, "");
                    const lastNumber = parseInt(lastNumberStr, 10);
                    if (!isNaN(lastNumber)) {
                        number = lastNumber + 1;
                    }
                }
                // tạo slipCode với số thứ tự tăng dần và có 4 số
                const slipCode = `${prefix}${number.toString().padStart(4, "0")}`; //XKBH26040001
                //làm tròn 2 chữ số thập phân
                const roundedTotalPrice = Math.round(totalPricePayment * 100) / 100;
                // Tạo outbound
                const outbound = await crud_helper_repository_1.CrudHelper.createData({
                    model: outboundHistory_1.OutboundHistory,
                    data: {
                        customerId,
                        dateOutbound: now,
                        outboundSlipCode: slipCode,
                        totalPriceOrder,
                        totalPriceVAT: Math.round(totalPriceVAT * 100) / 100, // làm tròn 2 chữ số thập phân
                        totalPricePayment: roundedTotalPrice,
                        paidAmount: 0,
                        remainingAmount: roundedTotalPrice,
                        totalOutboundQty,
                        outboundBy,
                    },
                    transaction,
                });
                // Tạo outbound detail
                for (const item of preparedDetails) {
                    if (item.deliveryItemId) {
                        const itemIdExists = await deliveryItem_1.DeliveryItem.findByPk(item.deliveryItemId, { transaction });
                        if (!itemIdExists) {
                            throw appError_1.AppError.BadRequest(`Mã tham chiếu giao hàng cho đơn hàng đã bị xóa hoặc thay đổi. Vui lòng tải lại trang!`, "DELIVERY_ITEM_NOT_FOUND");
                        }
                    }
                    await crud_helper_repository_1.CrudHelper.createData({
                        model: outboundDetail_1.OutboundDetail,
                        data: {
                            outboundId: outbound.outboundId,
                            orderId: item.orderId,
                            outboundQty: item.outboundQty,
                            price: item.price,
                            totalPriceOutbound: item.totalPriceOutbound,
                            deliveredQty: item.deliveredQty,
                            deliveryItemId: item.deliveryItemId,
                            isPromotion: item.isPromotion,
                        },
                        transaction,
                    });
                    // Cập nhật tồn kho
                    const finalQty = item.currentQtyInventory - item.outboundQty;
                    const finalValue = finalQty < 0 ? 0 : finalQty * item.price;
                    await inventory_1.Inventory.update({
                        totalQtyOutbound: item.currentTotalQtyOutbound + item.outboundQty,
                        qtyInventory: finalQty,
                        valueInventory: finalValue,
                    }, {
                        where: { orderId: item.orderId },
                        transaction,
                    });
                    // Cập nhật trạng thái lịch giao hàng nếu có
                    if (item.deliveryItemId) {
                        await deliveryItem_1.DeliveryItem.update({ status: "outbound" }, { where: { deliveryItemId: item.deliveryItemId }, transaction });
                    }
                }
                //inventory logs
                const logItems = preparedDetails.map((item) => {
                    const inv = inventoryMap.get(item.orderId);
                    return {
                        inventoryId: inv.inventoryId,
                        changeQty: -item.outboundQty,
                    };
                });
                await inventoryLogService_1.inventoryLogService.followInventoryChange({
                    items: logItems,
                    type: "OUTBOUND",
                    transaction,
                });
                //--------------------MEILISEARCH-----------------------
                const orderIdMeili = preparedDetails.map((item) => item.orderId);
                await exports.outboundService.syncDataOutbound(outbound.outboundId, orderIdMeili, transaction);
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
    updateOutbound: async ({ outboundId, updatedBy, outboundDetails, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!outboundDetails || outboundDetails.length === 0) {
                    throw appError_1.AppError.BadRequest("Phải chọn ít nhất 1 đơn hàng", "EMPTY_ORDER_LIST");
                }
                const outbound = await outboundHistory_1.OutboundHistory.findByPk(outboundId, {
                    include: [{ model: outboundDetail_1.OutboundDetail, as: "detail" }],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!outbound) {
                    throw appError_1.AppError.NotFound("Phiếu xuất kho không tồn tại", "OUTBOUND_NOT_FOUND");
                }
                const logItems = [];
                const oldDetails = outbound.detail ?? [];
                const usedOldDetailIds = new Set();
                let customerId = null;
                let totalPriceOrder = 0;
                let totalPriceVAT = 0;
                let totalPricePayment = 0;
                let totalOutboundQty = 0;
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
                    //check tồn kho
                    const inventory = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
                        orderId: item.orderId,
                        transaction,
                        options: { lock: transaction.LOCK.UPDATE },
                    });
                    if (!inventory) {
                        throw appError_1.AppError.BadRequest(`Order ${item.orderId} chưa có tồn kho`, "INVENTORY_NOT_FOUND");
                    }
                    const oldDetail = item.outboundDetailId
                        ? oldDetails.find((d) => d.outboundDetailId === item.outboundDetailId)
                        : null;
                    // Logic giá & khuyến mãi
                    const isPromotion = !!item.isPromotion;
                    const currentPrice = isPromotion ? 0 : order.pricePaper;
                    const currentTotalPrice = currentPrice * item.outboundQty;
                    const oldQty = oldDetail ? oldDetail.outboundQty : 0;
                    // tính toán cập nhật tồn kho
                    const finalQty = inventory.qtyInventory + oldQty - item.outboundQty;
                    const finalValue = finalQty < 0 ? 0 : finalQty * currentPrice;
                    await inventory_1.Inventory.update({
                        totalQtyOutbound: inventory.totalQtyOutbound - oldQty + item.outboundQty,
                        qtyInventory: finalQty,
                        valueInventory: finalValue,
                    }, { where: { orderId: item.orderId }, transaction });
                    //inventory logs
                    const netChangeQty = oldQty - item.outboundQty;
                    if (netChangeQty !== 0) {
                        logItems.push({
                            inventoryId: inventory.inventoryId,
                            changeQty: netChangeQty,
                        });
                    }
                    const vatRate = isPromotion ? 0 : (order.vat ?? 0) / 100;
                    const vatAmount = currentTotalPrice * vatRate;
                    totalPriceOrder += currentTotalPrice;
                    totalPriceVAT += vatAmount;
                    totalPricePayment += currentTotalPrice + vatAmount;
                    totalOutboundQty += item.outboundQty;
                    if (oldDetail) {
                        // Đánh dấu dòng cũ này ĐƯỢC GIỮ LẠI
                        usedOldDetailIds.add(oldDetail.outboundDetailId);
                        await oldDetail.update({
                            outboundQty: item.outboundQty,
                            price: currentPrice,
                            totalPriceOutbound: currentTotalPrice,
                            deliveryItemId: item.deliveryItemId,
                            isPromotion: isPromotion,
                        }, { transaction });
                    }
                    else {
                        const exportedQty = await warehouseRepository_1.warehouseRepository.sumOutboundQtyExcludeOutbound({
                            orderId: item.orderId,
                            outboundId,
                            transaction,
                        });
                        await outboundDetail_1.OutboundDetail.create({
                            outboundId,
                            orderId: item.orderId,
                            outboundQty: item.outboundQty,
                            price: currentPrice,
                            totalPriceOutbound: currentTotalPrice,
                            deliveredQty: Number(exportedQty ?? 0),
                            deliveryItemId: item.deliveryItemId,
                            isPromotion: isPromotion,
                        }, { transaction });
                        if (item.deliveryItemId) {
                            await deliveryItem_1.DeliveryItem.update({ status: "outbound" }, { where: { deliveryItemId: item.deliveryItemId }, transaction });
                        }
                    }
                }
                // XỬ LÝ DELETE đơn bị xóa khỏi phiếu
                for (const oldDetail of oldDetails) {
                    if (!usedOldDetailIds.has(oldDetail.outboundDetailId)) {
                        const inv = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
                            orderId: oldDetail.orderId,
                            transaction,
                            options: { lock: transaction.LOCK.UPDATE },
                        });
                        // hoàn kho
                        if (inv) {
                            const finalQty = inv.qtyInventory + oldDetail.outboundQty;
                            const finalValue = finalQty < 0 ? 0 : finalQty * oldDetail.price;
                            await inventory_1.Inventory.update({
                                totalQtyOutbound: inv.totalQtyOutbound - oldDetail.outboundQty,
                                qtyInventory: finalQty,
                                valueInventory: finalValue,
                            }, { where: { orderId: oldDetail.orderId }, transaction });
                            //inventory logs
                            logItems.push({ inventoryId: inv.inventoryId, changeQty: oldDetail.outboundQty });
                        }
                        if (oldDetail.deliveryItemId) {
                            await deliveryItem_1.DeliveryItem.update({ status: "planned" }, { where: { deliveryItemId: oldDetail.deliveryItemId }, transaction });
                        }
                        await oldDetail.destroy({ transaction });
                    }
                }
                // Tính toán lại tổng tiền thanh toán và số tiền còn lại
                const roundedTotalPrice = Math.round(totalPricePayment * 100) / 100;
                const paidAmount = Number(outbound.paidAmount ?? 0);
                const remainingAmount = Math.round((roundedTotalPrice - paidAmount) * 100) / 100;
                // Cập nhật outbound header
                await outbound.update({
                    totalPriceOrder,
                    totalPriceVAT: Math.round(totalPriceVAT * 100) / 100, // làm tròn 2 chữ số thập phân
                    totalPricePayment: roundedTotalPrice,
                    remainingAmount,
                    totalOutboundQty,
                    updatedBy,
                }, { transaction });
                // Cập nhật log inventory
                if (logItems.length > 0) {
                    await inventoryLogService_1.inventoryLogService.followInventoryChange({
                        items: logItems,
                        type: "ADJUSTMENT_OUTBOUND",
                        transaction,
                    });
                }
                //--------------------MEILISEARCH-----------------------
                // Thu thập TẤT CẢ orderId bị ảnh hưởng (bao gồm đơn hàng trong đợt update này VÀ đơn hàng cũ có thể đã bị xóa)
                const currentOrderIds = outboundDetails.map((item) => item.orderId);
                const oldOrderIds = oldDetails.map((detail) => detail.orderId);
                // Gộp mảng và sử dụng Set để loại bỏ các orderId trùng lặp
                const affectedOrderIds = [...new Set([...currentOrderIds, ...oldOrderIds])];
                await exports.outboundService.syncDataOutbound(outboundId, affectedOrderIds, transaction);
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
    syncDataOutbound: async (outboundId, orderIds, transaction) => {
        try {
            const listOrderIds = Array.isArray(orderIds) ? orderIds : [orderIds];
            const [outbound, inventories] = await Promise.all([
                warehouseRepository_1.warehouseRepository.syncOutboundForMeili(outboundId, transaction),
                inventoryRepository_1.inventoryRepository.syncAllInventoryToMeili(listOrderIds, transaction),
            ]);
            const flattenInventory = inventories.map(meiliTransformer_1.meiliTransformer.inventory);
            if (outbound) {
                const meiliFormatted = meiliTransformer_1.meiliTransformer.outbound(outbound);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.OUTBOUNDS,
                    data: meiliFormatted,
                    transaction,
                });
            }
            // Phân loại: Khác 0 thì giữ/cập nhật, Bằng 0 thì xóa
            const validInventories = [];
            const deleteInventoryIds = [];
            for (const inv of inventories) {
                if (inv.qtyInventory !== 0) {
                    validInventories.push(inv);
                }
                else {
                    deleteInventoryIds.push(inv.inventoryId);
                }
            }
            // Upsert các đơn còn tồn kho
            if (validInventories.length > 0) {
                const flattenInventory = validInventories.map(meiliTransformer_1.meiliTransformer.inventory);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                    data: flattenInventory,
                    transaction,
                });
            }
            // Delete khỏi Meilisearch các đơn đã hết tồn kho
            if (deleteInventoryIds.length > 0) {
                await meiliService_1.meiliService.deleteMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                    idOrIds: deleteInventoryIds,
                    transaction,
                });
            }
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
                if (outbound.status !== "unpaid" || (outbound.paidAmount && outbound.paidAmount > 0)) {
                    throw appError_1.AppError.BadRequest("Không thể hủy phiếu xuất kho đã có thanh toán!", "OUTBOUND_ALREADY_PAID");
                }
                const logItems = [];
                const details = outbound.detail ?? [];
                // Hoàn kho cho từng order
                for (const detail of details) {
                    // Bật Row Lock cho từng dòng Inventory tương ứng
                    const inv = await inventoryRepository_1.inventoryRepository.findInvByOrderId({
                        orderId: detail.orderId,
                        transaction,
                        options: { lock: transaction.LOCK.UPDATE },
                    });
                    if (inv) {
                        // Tính toán số lượng và giá trị tuyệt đối sau khi hủy phiếu
                        const finalQty = inv.qtyInventory + detail.outboundQty;
                        const finalValue = finalQty < 0 ? 0 : finalQty * detail.price;
                        await inventory_1.Inventory.update({
                            totalQtyOutbound: inv.totalQtyOutbound - detail.outboundQty,
                            qtyInventory: finalQty,
                            valueInventory: finalValue,
                        }, {
                            where: { orderId: detail.orderId },
                            transaction,
                        });
                        logItems.push({
                            inventoryId: inv.inventoryId,
                            changeQty: detail.outboundQty,
                        });
                    }
                    if (detail.deliveryItemId) {
                        await deliveryItem_1.DeliveryItem.update({ status: "planned" }, { where: { deliveryItemId: detail.deliveryItemId }, transaction });
                    }
                }
                // Xóa outbound detail
                await outboundDetail_1.OutboundDetail.destroy({
                    where: { outboundId },
                    transaction,
                });
                // Xóa outbound history
                await outbound.destroy({ transaction });
                // Cập nhật log inventory
                if (logItems.length > 0) {
                    await inventoryLogService_1.inventoryLogService.followInventoryChange({
                        items: logItems,
                        type: "CANCEL_OUTBOUND",
                        transaction,
                    });
                }
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.deleteMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.OUTBOUNDS,
                    idOrIds: outboundId,
                    transaction,
                });
                //update inventory in meilisearch
                const orderIds = details.map((d) => d.orderId);
                if (orderIds.length > 0) {
                    const updatedInvs = await inventoryRepository_1.inventoryRepository.syncAllInventoryToMeili(orderIds, transaction);
                    const validInventories = [];
                    const deleteInventoryIds = [];
                    for (const inv of updatedInvs) {
                        if (inv.qtyInventory !== 0) {
                            validInventories.push(inv);
                        }
                        else {
                            deleteInventoryIds.push(inv.inventoryId);
                        }
                    }
                    if (validInventories.length > 0) {
                        const flattenInventory = validInventories.map(meiliTransformer_1.meiliTransformer.inventory);
                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                            indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                            data: flattenInventory,
                            transaction,
                        });
                    }
                    if (deleteInventoryIds.length > 0) {
                        await meiliService_1.meiliService.deleteMeiliData({
                            indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                            idOrIds: deleteInventoryIds,
                            transaction,
                        });
                    }
                }
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
    exportFilePDFOutbound: async (res, outboundId, hasMoney) => {
        try {
            await (0, exportPDF_1.exportWarehouse)(res, outboundId, hasMoney);
        }
        catch (error) {
            console.error("Error export file outbound:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelOutboundDetail: async (res, fromDate, toDate, userName) => {
        try {
            let whereCondition = {};
            if (fromDate && toDate) {
                const startTimestamp = (0, dayjs_config_1.dayjsUtc)(fromDate).startOf("day").toDate();
                const endTimestamp = (0, dayjs_config_1.dayjsUtc)(toDate).endOf("day").toDate();
                // console.log(`start: ${fromDate} - end: ${toDate}`);
                // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);
                whereCondition.dateOutbound = { [sequelize_1.Op.between]: [startTimestamp, endTimestamp] };
            }
            const baseQuery = {
                attributes: [
                    "outboundDetailId",
                    "orderId",
                    "outboundQty",
                    "price",
                    "totalPriceOutbound",
                    "deliveredQty",
                    "isPromotion",
                ],
                include: [
                    {
                        model: outboundHistory_1.OutboundHistory,
                        where: whereCondition,
                        attributes: ["outboundSlipCode", "dateOutbound"],
                        required: true,
                    },
                    {
                        model: order_1.Order,
                        attributes: [
                            "orderId",
                            "dvt",
                            "flute",
                            "QC_box",
                            "discount",
                            "lengthPaperManufacture",
                            "paperSizeManufacture",
                            "vat",
                        ],
                        required: true,
                        include: [
                            { model: customer_1.Customer, attributes: ["customerName"] },
                            { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                        ],
                    },
                ],
            };
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: outboundDetail_1.OutboundDetail,
                sheetName: "Chi tiết xuất kho",
                fileName: `outbound_detail`,
                columns: outboundDetailRowAndColumn_1.outboundDetailColumns,
                rows: outboundDetailRowAndColumn_1.mappingOutboundDetailRow,
                userName: userName,
            });
        }
        catch (error) {
            console.error("Error export Excel outbound detail:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=outboundService.js.map