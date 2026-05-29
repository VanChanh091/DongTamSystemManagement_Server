import { Op } from "sequelize";
import { Response } from "express";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import { orderRepository } from "../../repository/orderRepository";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { syntheticRepository } from "../../repository/syntheticRepository";
import { exportExcelStreamResponse } from "../../utils/helper/excelExporter";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
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
        statusFilter = ["accept", "planning", "completed"];
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

        if (startDate && endDate) {
          const startTimestamp = dayjsUtc.utc(startDate).startOf("day").unix();
          filters.push(`dayReceiveOrder >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.utc(endDate).endOf("day").unix();
          filters.push(`dayReceiveOrder <= ${endTimestamp}`);
        }

        // console.log(`start: ${startDate} - end: ${endDate}`);
        // console.log(`filter: ${filters.join(" AND ")}`);
      }

      const searchResult = await index.search(searchKeyword, {
        filter: filters.join(" AND "),
        attributesToRetrieve: ["orderId"],
        attributesToSearchOn: searchKeyword ? [field] : [],
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
        status,
        allOrders,
        condition: { orderId: { [Op.in]: orderIds } },
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

  completeOrder: async (orderIds: string[]) => {
    try {
      return await runInTransaction(async (transaction) => {
        const orders = await Order.findAll({
          where: { orderId: { [Op.in]: orderIds } },
          attributes: ["orderId", "orderSortValue", "status"],
          transaction,
        });
        if (orders.length === 0) {
          throw AppError.NotFound("No orders found to complete", "ORDERS_NOT_FOUND");
        }

        const invalidOrder = orders.find((o) => o.status == "accept");
        if (invalidOrder) {
          throw AppError.BadRequest(
            `Đơn hàng ${invalidOrder.orderId} chưa được xếp kế hoạch`,
            "INVALID_ORDER_STATUS",
          );
        }
        const distinctOrderIds = orders.map((o) => o.orderId);

        const papers = await PlanningPaper.findAll({
          where: { orderId: { [Op.in]: distinctOrderIds } },
          attributes: [
            "planningId",
            "orderId",
            "qtyProduced",
            "status",
            "statusRequest",
            "deliveryPlanned",
          ],
          transaction,
        });
        if (papers.length === 0) {
          throw AppError.NotFound(
            "No planning papers found for the orders",
            "PLANNING_PAPERS_NOT_FOUND",
          );
        }

        const hasZeroQty = papers.some((p) => p.qtyProduced === null || p.qtyProduced === 0);
        if (hasZeroQty) {
          throw AppError.BadRequest(
            "Không thể hoàn thành đơn hàng khi có số lượng chưa sản xuất",
            "ZERO_QTY_PRODUCED",
          );
        }

        const distinctPaperIds = papers.map((p) => p.planningId);

        await Order.update(
          { status: "completed" },
          { where: { orderId: { [Op.in]: distinctOrderIds } }, transaction },
        );

        if (distinctPaperIds.length > 0) {
          await PlanningPaper.update(
            {
              status: "complete",
              statusRequest: "finalize",
              deliveryPlanned: "delivered",
            },
            { where: { planningId: { [Op.in]: distinctPaperIds } }, transaction },
          );
        }

        if (distinctOrderIds.length > 0) {
          const ordersToMeili = orders.map((o) => ({
            orderId: o.orderId,
            status: "completed",
            orderSortValue: o.orderSortValue,
          }));

          const paperToMeili = papers.map((p) => ({
            planningId: p.planningId,
            status: "complete",
            statusRequest: "finalize",
            deliveryPlanned: "delivered",
          }));

          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.ORDERS,
            data: ordersToMeili,
            transaction,
            isUpdate: true,
          });
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.PLANNING_PAPERS,
            data: paperToMeili,
            transaction,
            isUpdate: true,
          });
        }

        return { message: "Orders completed successfully" };
      });
    } catch (error) {
      console.error("Error complete orders:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelOrder: async (res: Response, { fromDate, toDate }: any) => {
    // const startTime = performance.now();

    try {
      let whereCondition: any = {
        status: { [Op.in]: ["accept", "planning", "completed"] },
      };

      if (fromDate && toDate) {
        const startTimestamp = dayjsUtc(fromDate).startOf("day").toDate();
        const endTimestamp = dayjsUtc(toDate).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dayReceiveOrder = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const baseQuery: any = orderRepository.buildOrdersOptions({ whereCondition, isExport: true });

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: Order,
        sheetName: "Danh sách đơn hàng",
        fileName: "orders",
        columns: orderColumns,
        rows: mappingOrderRow,
      });

      // const endTime = performance.now();
      // console.log(`Execution time: ${(endTime - startTime).toFixed(2)} ms`);
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      throw AppError.ServerError();
    }
  },
};
