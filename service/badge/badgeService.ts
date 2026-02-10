import { Op } from "sequelize";
import { Order } from "../../models/order/order";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { AppError } from "../../utils/appError";
import { PlanningBox } from "../../models/planning/planningBox";

export const badgeService = {
  //pending order (admin)
  countOrderPending: async () => {
    try {
      const count = await Order.count({ where: { status: "pending" } });

      return { message: "Count order pending successfully", data: count };
    } catch (error) {
      console.error(`Count order pending failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //order reject
  countOrderRejected: async (userId: number) => {
    try {
      const count = await Order.count({ where: { status: "reject", userId: userId } });

      return { message: "Count order rejected successfully", data: count };
    } catch (error) {
      console.error(`Count order rejected failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //order pending planning
  countOrderPendingPlanning: async () => {
    try {
      const count = await Order.count({ where: { status: "accept" } });
      return { message: "Count order pending planning successfully", data: count };
    } catch (error) {
      console.error(`Count order pending planning failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //planning stop
  countPlanningStop: async () => {
    try {
      const count = await PlanningPaper.count({ where: { status: "stop" } });
      return { message: "Count planning stop successfully", data: count };
    } catch (error) {
      console.error(`Count planning stop failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //waiting check paper & box
  countWaitingCheckPaper: async () => {
    try {
      const count = await PlanningPaper.count({
        where: { hasBox: false, statusRequest: { [Op.in]: ["requested", "inbounded"] } },
      });

      return { message: "Count waiting check paper successfully", data: count };
    } catch (error) {
      console.error(`Count waiting check paper failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  countWaitingCheckBox: async () => {
    try {
      const count = await PlanningBox.count({
        where: { statusRequest: { [Op.in]: ["requested", "inbounded"] } },
      });

      return { message: "Count waiting check box successfully", data: count };
    } catch (error) {
      console.error(`Count waiting check box failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
