"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntheticOrderService = void 0;
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const labelFields_1 = require("../../assets/labelFields");
const product_1 = require("../../models/product/product");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const orderRepository_1 = require("../../repository/orderRepository");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const planningPaper_1 = require("../../models/planning/planningPaper");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const inventoryLogService_1 = require("../inventory/inventoryLogService");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const syntheticRepository_1 = require("../../repository/synthetic/syntheticRepository");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const orderRowAndColumn_1 = require("../../utils/mapping/orderRowAndColumn");
const devEnvironment = process.env.NODE_ENV !== "production";
const { order } = cacheKey_1.CacheKey.synthetic;
exports.syntheticOrderService = {
    getAllOrderByStatus: async ({ page, pageSize, status, allOrders, }) => {
        try {
            const volatileStatuses = ["accept", "planning"];
            const isVolatile = Array.isArray(status)
                ? status.some((s) => volatileStatuses.includes(s))
                : volatileStatuses.includes(status);
            if (isVolatile) {
                const { rows, count } = await syntheticRepository_1.syntheticRepository.getAllOrderByStatus({
                    page,
                    pageSize,
                    status,
                    allOrders,
                });
                return {
                    message: "Get all orders successfully",
                    data: rows,
                    totalOrders: count,
                    totalPages: Math.ceil(count / pageSize),
                    currentPage: page,
                };
            }
            const statusString = Array.isArray(status) ? status.join(",") : status;
            const key = allOrders === "all" ? "all" : statusString;
            const cacheKey = order.all(key, page);
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, as: "Order" }, { model: inventory_1.Inventory }], "syntheticOrder");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("syntheticOrder");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data PlanningPaper from Redis");
                    return {
                        ...JSON.parse(cachedData),
                        message: `get all orders with status: ${key} from cache successfully`,
                    };
                }
            }
            const { rows, count } = await syntheticRepository_1.syntheticRepository.getAllOrderByStatus({
                page,
                pageSize,
                status,
                allOrders,
            });
            const responseData = {
                message: "Get all orders successfully",
                data: rows,
                totalOrders: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("Error get all orders:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getPlanningBoxDetail: async (orderId) => {
        try {
            const data = await syntheticRepository_1.syntheticRepository.getPlanningBoxDetail(orderId);
            if (!data) {
                return { message: "No planning box found for this order", data: null };
            }
            return { message: "Get box detail successfully", data };
        }
        catch (error) {
            console.error("Error get box detail:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getSyntheticOrderByField: async ({ field, keyword, page, pageSize, status, allOrders, startDate, endDate, }) => {
        try {
            const validFields = ["orderId", "customerName", "dayReceiveOrder", "fullName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("orders");
            let statusFilter;
            if (allOrders === "all") {
                statusFilter = ["accept", "planning", "completed"];
            }
            else {
                statusFilter = Array.isArray(status) ? status : [status];
            }
            // Phân quyền và Trạng thái
            const statusFormatted = statusFilter.map((s) => `"${s}"`).join(", ");
            let filters = [`status IN [${statusFormatted}]`];
            // Lọc theo ngày nếu có
            let searchKeyword = keyword;
            if (field === "dayReceiveOrder") {
                searchKeyword = "";
                if (startDate && endDate) {
                    const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").unix();
                    filters.push(`dayReceiveOrder >= ${startTimestamp}`);
                    const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").unix();
                    filters.push(`dayReceiveOrder <= ${endTimestamp}`);
                }
                // console.log(`start: ${startDate} - end: ${endDate}`);
                // console.log(`filter: ${filters.join(" AND ")}`);
            }
            const searchResult = await index.search(searchKeyword, {
                filter: filters.join(" AND "),
                attributesToRetrieve: ["orderId"],
                attributesToSearchOn: searchKeyword ? [field] : [],
                sort: ["orderSortValue:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            const orderIds = searchResult.hits.map((hit) => hit.orderId);
            if (orderIds.length === 0) {
                return {
                    message: "No orders found",
                    data: [],
                    totalOrders: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const { rows } = await syntheticRepository_1.syntheticRepository.getAllOrderByStatus({
                status,
                allOrders,
                condition: { orderId: { [sequelize_1.Op.in]: orderIds } },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = orderIds.map((id) => rows.find((o) => o.orderId === id)).filter(Boolean);
            return {
                message: "Get orders from Meilisearch & DB successfully",
                data: finalData,
                totalOrders: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error("Error get box detail:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    completeOrder: async (orderIds, allowNegativeInv = false) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const orders = await order_1.Order.findAll({
                    where: { orderId: { [sequelize_1.Op.in]: orderIds } },
                    attributes: ["orderId", "orderSortValue", "status", "quantityManufacture"],
                    include: [{ model: product_1.Product, attributes: ["typeProduct"] }],
                    transaction,
                });
                if (orders.length === 0) {
                    throw appError_1.AppError.NotFound("No orders found to complete", "ORDERS_NOT_FOUND");
                }
                const distinctOrderIds = orders.map((o) => o.orderId);
                // phân loại đơn hàng
                const regularOrders = orders.filter((o) => o.Product?.typeProduct !== "Phí Khác");
                const regularOrderIds = regularOrders.map((o) => o.orderId);
                const invalidOrder = regularOrders.find((o) => o.status === "accept" && Number(o.quantityManufacture) !== 0);
                if (invalidOrder) {
                    throw appError_1.AppError.BadRequest(`Đơn hàng ${invalidOrder.orderId} chưa được xếp kế hoạch`, "INVALID_ORDER_STATUS");
                }
                let papers = [];
                let distinctPaperIds = [];
                //chỉ xử lí những đơn hàng khác phí khác
                if (regularOrders.length > 0) {
                    papers = await planningPaper_1.PlanningPaper.findAll({
                        where: { orderId: { [sequelize_1.Op.in]: regularOrderIds } },
                        attributes: [
                            "planningId",
                            "orderId",
                            "qtyProduced",
                            "status",
                            "statusRequest",
                            "deliveryPlanned",
                        ],
                        include: [{ model: order_1.Order, attributes: ["quantityManufacture"] }],
                        transaction,
                    });
                    if (papers.length > 0) {
                        const hasInvalidQty = papers.some((p) => {
                            if (p.Order?.quantityManufacture === 0)
                                return false;
                            return p.qtyProduced === null || p.qtyProduced === 0;
                        });
                        if (hasInvalidQty) {
                            throw appError_1.AppError.BadRequest("Không thể hoàn thành đơn hàng khi có số lượng chưa sản xuất", "ZERO_QTY_PRODUCED");
                        }
                    }
                    distinctPaperIds = papers.map((p) => p.planningId);
                    const inventories = await inventory_1.Inventory.findAll({
                        where: { orderId: { [sequelize_1.Op.in]: regularOrderIds } },
                        transaction,
                    });
                    // const isNegativeInv = inventories.some((inv) => inv.valueInventory < 0);
                    // if (isNegativeInv && !allowNegativeInv) {
                    //   return {
                    //     message: "Có đơn hàng tồn kho bị âm. Tiếp tục để hoàn thành các đơn này",
                    //     allowNegativeInv: true,
                    //   };
                    // }
                    // lọc và map dữ liệu tồn kho âm để cập nhật
                    const inventoryUpdates = inventories
                        .filter((inv) => inv.qtyInventory < 0)
                        .map((inv) => ({
                        orderId: inv.orderId,
                        inventoryId: inv.inventoryId,
                        qtyVariance: (inv.qtyVariance || 0) + inv.qtyInventory,
                        qtyInventory: 0,
                    }));
                    if (inventoryUpdates.length > 0) {
                        await inventory_1.Inventory.bulkCreate(inventoryUpdates, {
                            updateOnDuplicate: ["qtyInventory", "qtyVariance"],
                            transaction,
                        });
                        //inventory logs
                        const logItems = inventories
                            .filter((inv) => inv.qtyInventory < 0)
                            .map((inv) => ({
                            inventoryId: inv.inventoryId,
                            changeQty: -inv.qtyInventory,
                        }));
                        await inventoryLogService_1.inventoryLogService.followInventoryChange({
                            type: "ADJUSTMENT_OUTBOUND",
                            items: logItems,
                            transaction,
                        });
                    }
                }
                await order_1.Order.update({ status: "completed" }, { where: { orderId: { [sequelize_1.Op.in]: distinctOrderIds } }, transaction });
                if (distinctPaperIds.length > 0) {
                    await planningPaper_1.PlanningPaper.update({
                        status: "complete",
                        statusRequest: "finalize",
                        deliveryPlanned: "delivered",
                    }, { where: { planningId: { [sequelize_1.Op.in]: distinctPaperIds } }, transaction });
                }
                //---------------------MEILISEARCH--------------------------
                if (distinctOrderIds.length > 0) {
                    const ordersToMeili = orders.map((o) => ({
                        orderId: o.orderId,
                        status: "completed",
                        orderSortValue: o.orderSortValue,
                    }));
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                        data: ordersToMeili,
                        transaction,
                        isUpdate: true,
                    });
                    if (distinctPaperIds.length > 0) {
                        const paperToMeili = papers.map((p) => ({
                            planningId: p.planningId,
                            status: "complete",
                            statusRequest: "finalize",
                            deliveryPlanned: "delivered",
                        }));
                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                            data: paperToMeili,
                            transaction,
                            isUpdate: true,
                        });
                    }
                }
                return { message: "Orders completed successfully" };
            });
        }
        catch (error) {
            console.error("Error complete orders:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelOrder: async (res, { fromDate, toDate }, userName) => {
        // const startTime = performance.now();
        try {
            let whereCondition = {
                status: { [sequelize_1.Op.in]: ["accept", "planning", "completed"] },
            };
            if (fromDate && toDate) {
                const startTimestamp = (0, dayjs_config_1.dayjsUtc)(fromDate).startOf("day").toDate();
                const endTimestamp = (0, dayjs_config_1.dayjsUtc)(toDate).endOf("day").toDate();
                // console.log(`start: ${fromDate} - end: ${toDate}`);
                // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);
                whereCondition.dayApproved = { [sequelize_1.Op.between]: [startTimestamp, endTimestamp] };
            }
            const baseQuery = orderRepository_1.orderRepository.buildOrdersOptions({ whereCondition, isExport: true });
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: order_1.Order,
                sheetName: "Danh sách đơn hàng",
                fileName: "orders",
                columns: orderRowAndColumn_1.orderColumns,
                rows: orderRowAndColumn_1.mappingOrderRow,
                userName: userName,
            });
            // const endTime = performance.now();
            // console.log(`Execution time: ${(endTime - startTime).toFixed(2)} ms`);
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=synthetic.orderService.js.map