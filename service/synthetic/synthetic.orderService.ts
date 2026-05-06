import { AppError } from "../../utils/appError";
import { syntheticRepository } from "../../repository/syntheticRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { Response } from "express";
import { orderRepository } from "../../repository/orderRepository";
import { Op } from "sequelize";
import { Order } from "../../models/order/order";
import { mappingOrderRow, orderColumns } from "../../utils/mapping/orderRowAndColumn";

export const syntheticOrderService = {
  getAllOrderByStatus: async ({
    page,
    pageSize,
    status,
    allOrders,
  }: {
    page: number;
    pageSize: number;
    status: string | string[];
    allOrders?: string;
  }) => {
    try {
      const { rows, count } = await syntheticRepository.getAllOrderByStatus({
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

      return responseData;
    } catch (error) {
      console.error("Error get all orders:", error);
      throw AppError.ServerError();
    }
  },

  getPlanningBoxDetail: async (orderId: string) => {
    try {
      const data = await syntheticRepository.getPlanningBoxDetail(orderId);

      if (!data) {
        throw AppError.NotFound("Planning box not found", "PLANNING_BOX_NOT_FOUND");
      }

      return { message: "Get box detail successfully", data };
    } catch (error) {
      console.error("Error get box detail:", error);
      throw AppError.ServerError();
    }
  },

  getSyntheticOrderByField: async ({
    field,
    keyword,
    page,
    pageSize,
    status,
    allOrders,
    startDate,
    endDate,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
    status: string | string[];
    allOrders?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const validFields = ["orderId", "customerName", "dayReceiveOrder"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("orders");

      let statusFilter: string[];
      if (allOrders === "all") {
        statusFilter = ["planning", "completed"];
      } else {
        statusFilter = Array.isArray(status) ? status : [status];
      }

      // Phân quyền và Trạng thái
      const statusFormatted = statusFilter.map((s) => `"${s}"`).join(", ");
      let filters = [`status IN [${statusFormatted}]`];

      // Lọc theo ngày nếu có
      let searchKeyword = keyword;

      if (field === "dayReceiveOrder") {
        searchKeyword = "";

        console.log(`start: ${startDate} - end: ${endDate}`);

        if (startDate) {
          const dStart = new Date(startDate);
          dStart.setUTCHours(0, 0, 0, 0); // Đưa về đầu ngày theo chuẩn UTC
          const startTimestamp = Math.floor(dStart.getTime() / 1000);
          filters.push(`dayReceiveOrder >= ${startTimestamp}`);
        }

        if (endDate) {
          const dEnd = new Date(endDate);
          dEnd.setUTCHours(23, 59, 59, 999); // Đưa về cuối ngày theo chuẩn UTC
          const endTimestamp = Math.floor(dEnd.getTime() / 1000);
          filters.push(`dayReceiveOrder <= ${endTimestamp}`);
        }
      }

      const searchResult = await index.search(searchKeyword, {
        filter: filters.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["orderId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      });

      const orderIds = searchResult.hits.map((hit: any) => hit.orderId);
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
      const { rows } = await syntheticRepository.getAllOrderByStatus({
        page,
        pageSize,
        status,
        allOrders,
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
    } catch (error) {
      console.error("Error get box detail:", error);
      throw AppError.ServerError();
    }
  },

  exportExcelOrder: async (res: Response, { fromDate, toDate }: any) => {
    try {
      let whereCondition: any = {
        status: { [Op.in]: ["accept", "planning", "completed"] },
      };

      if (fromDate && toDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        whereCondition.dayReceiveOrder = { [Op.between]: [start, end] };
      }

      const query = orderRepository.buildQueryOptions({ whereCondition });
      const data = await Order.findAll(query);

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Danh sách đơn hàng",
        fileName: "orders",
        columns: orderColumns,
        rows: mappingOrderRow,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      throw AppError.ServerError();
    }
  },
};
