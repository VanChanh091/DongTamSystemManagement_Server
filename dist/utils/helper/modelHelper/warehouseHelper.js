"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGrandTotal = exports.calculateTotalPriceByDate = exports.buildSearchWhereCondition = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../../models/order/order");
const customer_1 = require("../../../models/customer/customer");
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const outboundDetail_1 = require("../../../models/warehouse/outbound/outboundDetail");
const outboundHistory_1 = require("../../../models/warehouse/outbound/outboundHistory");
const warehouseRepository_1 = require("../../../repository/warehouseRepository");
const buildSearchWhereCondition = async (field, keyword, startDate, endDate) => {
    let searchWhereCondition = {};
    if (field === "dateOutbound") {
        // Hàm phụ check xem chuỗi ngày từ FE
        const isValidDateString = (dateStr) => {
            if (!dateStr ||
                dateStr === "" ||
                dateStr === "Invalid date" ||
                dateStr === "null" ||
                dateStr === "undefined") {
                return false;
            }
            return (0, dayjs_config_1.dayjsUtc)(dateStr).isValid();
        };
        if (isValidDateString(startDate) && isValidDateString(endDate)) {
            // Ép format về chuẩn YYYY-MM-DD của DB cho an toàn sạch sẽ
            const formattedStart = (0, dayjs_config_1.dayjsUtc)(startDate).format("YYYY-MM-DD");
            const formattedEnd = (0, dayjs_config_1.dayjsUtc)(endDate).format("YYYY-MM-DD");
            searchWhereCondition.dateOutbound = {
                [sequelize_1.Op.between]: [`${formattedStart} 00:00:00`, `${formattedEnd} 23:59:59`],
            };
        }
    }
    else if (field === "customerName" && keyword) {
        const matchedRecords = await outboundHistory_1.OutboundHistory.findAll({
            attributes: ["outboundId"],
            include: [
                {
                    model: outboundDetail_1.OutboundDetail,
                    as: "detail",
                    required: true,
                    attributes: [],
                    include: [
                        {
                            model: order_1.Order,
                            required: true,
                            attributes: [],
                            include: [
                                {
                                    model: customer_1.Customer,
                                    required: true,
                                    attributes: [],
                                    where: { customerName: { [sequelize_1.Op.like]: `%${keyword}%` } },
                                },
                            ],
                        },
                    ],
                },
            ],
            raw: true,
        });
        const allCustomerOutboundIds = Array.from(new Set(matchedRecords.map((item) => item.outboundId)));
        searchWhereCondition = { outboundId: { [sequelize_1.Op.in]: allCustomerOutboundIds } };
    }
    return searchWhereCondition;
};
exports.buildSearchWhereCondition = buildSearchWhereCondition;
const calculateTotalPriceByDate = async (dataList, searchWhereCondition = {}) => {
    if (!dataList || dataList.length === 0)
        return {};
    const uniqueDates = Array.from(new Set(dataList.map((item) => (0, dayjs_config_1.dayjsUtc)(item.dateOutbound).format("YYYY-MM-DD"))));
    const dateConditions = uniqueDates.map((date) => ({
        dateOutbound: { [sequelize_1.Op.between]: [`${date} 00:00:00`, `${date} 23:59:59`] },
    }));
    const dbTotals = await warehouseRepository_1.warehouseRepository.getTotalPriceByDateRanges({
        whereCondition: {
            [sequelize_1.Op.or]: dateConditions,
            ...searchWhereCondition,
        },
    });
    return dbTotals.reduce((acc, curr) => {
        acc[curr.dateStr] = Math.round(Number(curr.total));
        return acc;
    }, {});
};
exports.calculateTotalPriceByDate = calculateTotalPriceByDate;
const calculateGrandTotal = async (whereCondition) => {
    const result = await warehouseRepository_1.warehouseRepository.getTotalPriceGrandTotal(whereCondition);
    return {
        totalPriceOrder: Math.round(result?.totalPriceOrder || 0),
        totalPriceVAT: Math.round(result?.totalPriceVAT || 0),
        totalPricePayment: Math.round(result?.totalPricePayment || 0),
    };
};
exports.calculateGrandTotal = calculateGrandTotal;
//# sourceMappingURL=warehouseHelper.js.map