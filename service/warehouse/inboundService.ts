import dotenv from "dotenv";
dotenv.config();

import { CacheManager } from "../../utils/helper/cacheManager";
import { AppError } from "../../utils/appError";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { warehouseRepository } from "../../repository/warehouseRepository";

const devEnvironment = process.env.NODE_ENV !== "production";
const { planning, details, search } = CacheManager.keys.dashboard;

export const inboundService = {
  getAllInboundHistory: async (page: number, pageSize: number) => {
    try {
      //caching

      const inboundList = await warehouseRepository.getAllInboundHistory(page, pageSize);

      const totalInbound = await InboundHistory.count();
      const totalPages = Math.ceil(totalInbound / pageSize);

      const rows = inboundList.map((item) => {
        const json = item.toJSON();

        const planning = json.PlanningPaper ?? json.PlanningBox ?? null;

        delete json.PlanningPaper;
        delete json.PlanningBox;

        return {
          ...json,
          Planning: planning,
        };
      });

      const responseData = {
        message: "get all data paper from db",
        data: rows,
        totalInbound,
        totalPages,
        currentPage: page,
      };

      return responseData;
    } catch (error) {
      console.error("Error inbound history:", error);
      throw AppError.ServerError();
    }
  },

  getInboundByField: async ({
    field,
    keyword,
    page,
    pageSize,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
  }) => {
    try {
      //   const fieldMap = {
      //     orderId: (paper: PlanningPaper) => paper.orderId,
      //     ghepKho: (paper: PlanningPaper) => paper.ghepKho,
      //     machine: (paper: PlanningPaper) => paper.chooseMachine,
      //     customerName: (paper: PlanningPaper) => paper.Order.Customer.customerName,
      //     companyName: (paper: PlanningPaper) => paper.Order.Customer.companyName,
      //     username: (paper: PlanningPaper) => paper.Order.User.fullName,
      //   } as const;
      //   const key = field as keyof typeof fieldMap;
      //   if (!key || !fieldMap[key]) {
      //     throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      //   }
    } catch (error) {
      console.error("Error inbound paper:", error);
      throw AppError.ServerError();
    }
  },

  exportExcelInbound: async () => {
    try {
    } catch (error) {
      console.error("Error inbound paper:", error);
      throw AppError.ServerError();
    }
  },
};
