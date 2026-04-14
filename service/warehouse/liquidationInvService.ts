import { inventoryRepository } from "../../repository/inventoryRepository";
import { AppError } from "../../utils/appError";

export const liquidationInvService = {
  getAllLiquidationInv: async (page: number, pageSize: number) => {
    try {
      const { rows, count } = await inventoryRepository.getLiquidationInvByPage({ page, pageSize });
      const totals: any = await inventoryRepository.liquidationInvTotals();

      const responseData = {
        message: "Get all  liquidation inventory successfully",
        data: rows,
        totalInventory: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
        totalValueInventory: totals?.totalValueInventory || 0,
      };

      return responseData;
    } catch (error) {
      console.error("Failed to get liquidation inventory:", error);
      throw AppError.ServerError();
    }
  },
};
