"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liquidationInvService = void 0;
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const appError_1 = require("../../utils/appError");
exports.liquidationInvService = {
    getAllLiquidationInv: async (page, pageSize) => {
        try {
            const { rows, count } = await inventoryRepository_1.inventoryRepository.getLiquidationInvByPage({ page, pageSize });
            const totals = await inventoryRepository_1.inventoryRepository.liquidationInvTotals();
            const responseData = {
                message: "Get all  liquidation inventory successfully",
                data: rows,
                totalInventory: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
                totalValueInventory: totals?.totalValueInventory || 0,
            };
            return responseData;
        }
        catch (error) {
            console.error("Failed to get liquidation inventory:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=liquidationInvService.js.map