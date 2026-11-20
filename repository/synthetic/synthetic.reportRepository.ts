import { col, fn, Op } from "sequelize";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { OrderApproved } from "../../models/order/orderApproved";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { ReportPlanningBox } from "../../models/report/reportPlanningBox";
import { EmployeeBasicInfo } from "../../models/employee/employeeBasicInfo";
import { ReportPlanningPaper } from "../../models/report/reportPlanningPaper";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { OutboundHistory } from "../../models/warehouse/outbound/outboundHistory";
import { PaperRequirements } from "../../models/planning/requirement/paperRequirements";
import { QcInspectionBox } from "../../models/qualityControl/inspection/qcInspectionBox";
import { QcInspectionPaper } from "../../models/qualityControl/inspection/qcInspectionPaper";
import { PRODUCTION_ACTIVE_ORDER_STATUSES } from "../../utils/helper/modelHelper/productionRevenueRule";

export interface DailyAmountAggRow {
  dateKey: string;
  totalAmount: number | string;
}

export interface DailyPaperProductionAggRow extends DailyAmountAggRow {
  isBox: boolean | number;
}

export interface RawDailyPaperProductionRow {
  dayReport: Date | string;
  qtyProduced: number;
  totalPrice: number;
  PlanningPaper?: {
    runningPlan: number;
    Order?: {
      isBox: boolean | number;
      totalPrice: number;
    };
  };
}

export interface RawDailyBoxInboundRow {
  dateInbound: Date | string;
  totalPrice: number;
}

export interface DailyOutboundAggRow {
  dateKey: string;
  totalBeforeVat: number | string;
  totalVat: number | string;
  totalPayment: number | string;
}

export const syntheticReportRepository = {
  //====================================REVENUE DAY========================================
  getRawOutboundByCustomer: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return OutboundHistory.findAll({
      attributes: [
        "customerId",
        "dateOutbound",
        "totalPriceOrder",
        "totalPricePayment",
        "remainingAmount",
      ],
      where: { dateOutbound: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Customer,
          required: true,
          attributes: ["customerId", "customerName", "companyName"],
          where: userId ? { userId } : undefined,
        },
      ],
      raw: true,
      nest: true,
    });
  },

  //====================================REVENUE MONTH======================================
  // gom nhóm theo ngày duyệt đơn hàng
  getDailyApprovedOrders: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }): Promise<DailyAmountAggRow[]> => {
    const dateExpr = fn("DATE", col("Order.dayApproved"));
    return (await Order.findAll({
      attributes: [
        [dateExpr, "dateKey"],
        [fn("COALESCE", fn("SUM", col("Order.totalPrice")), 0), "totalAmount"],
      ],
      where: {
        dayApproved: { [Op.between]: [startDate, endDate] },
        status: { [Op.in]: [...PRODUCTION_ACTIVE_ORDER_STATUSES] },
        ...(userId ? { userId } : {}),
      },
      group: [dateExpr],
      raw: true,
    })) as unknown as DailyAmountAggRow[];
  },

  // lấy doanh số sản xuất giấy tấm theo ca 6h (gồm cả đơn thuần giấy tấm và đơn làm thùng)
  getDailyPaperProduction: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }): Promise<RawDailyPaperProductionRow[]> => {
    return (await ReportPlanningPaper.findAll({
      attributes: ["dayReport", "qtyProduced", "totalPrice"],
      where: { dayReport: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: PlanningPaper,
          required: true,
          attributes: ["runningPlan"],
          include: [
            {
              model: Order,
              required: true,
              attributes: ["isBox", "totalPrice"],
              where: {
                status: { [Op.in]: [...PRODUCTION_ACTIVE_ORDER_STATUSES] },
                ...(userId ? { userId } : {}),
              },
            },
          ],
        },
      ],
      raw: true,
      nest: true,
    })) as unknown as RawDailyPaperProductionRow[];
  },

  // gom nhóm đơn làm thùng nhập kho theo ca 6h
  getDailyBoxProductionInbound: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }): Promise<RawDailyBoxInboundRow[]> => {
    return (await InboundHistory.findAll({
      attributes: ["dateInbound", "totalPrice"],
      where: { dateInbound: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Order,
          required: true,
          attributes: [],
          where: {
            isBox: true,
            status: { [Op.in]: [...PRODUCTION_ACTIVE_ORDER_STATUSES] },
            ...(userId ? { userId } : {}),
          },
        },
      ],
      raw: true,
    })) as unknown as RawDailyBoxInboundRow[];
  },

  // gom nhóm theo chi tiết xuất kho
  getDailyProductionOutbound: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }): Promise<DailyOutboundAggRow[]> => {
    const dateExpr = fn("DATE", col("OutboundHistory.dateOutbound"));

    return (await OutboundHistory.findAll({
      attributes: [
        [dateExpr, "dateKey"],
        [fn("COALESCE", fn("SUM", col("OutboundHistory.totalPriceOrder")), 0), "totalBeforeVat"],
        [fn("COALESCE", fn("SUM", col("OutboundHistory.totalPriceVAT")), 0), "totalVat"],
        [fn("COALESCE", fn("SUM", col("OutboundHistory.totalPricePayment")), 0), "totalPayment"],
      ],
      where: { dateOutbound: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Customer,
          required: true,
          attributes: [],
          where: userId ? { userId } : undefined,
        },
      ],
      group: [dateExpr],
      raw: true,
    })) as unknown as DailyOutboundAggRow[];
  },

  //====================================REVENUE YEAR=======================================
  getRawOutboundMultiYear: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string;
    endDate: string;
    userId?: number | null;
  }) => {
    return OutboundHistory.findAll({
      attributes: ["customerId", "dateOutbound", "totalPriceOrder", "totalPricePayment"],
      where: {
        dateOutbound: { [Op.between]: [startDate, endDate] },
      },
      include: [
        {
          model: Customer,
          required: true,
          attributes: ["customerId", "customerName"],
          where: userId ? { userId } : undefined,
        },
      ],
      raw: true,
      nest: true,
    });
  },

  //====================================ERROR PRODUCTION=======================================
  getEmployeeErrorProduction: async (employeeId: number) => {
    return await EmployeeBasicInfo.findByPk(Number(employeeId), {
      attributes: ["fullName"],
      raw: true,
    });
  },

  getQcInspectionPaper: async ({
    paperWhere,
    startDate,
    endDate,
  }: {
    paperWhere: any;
    startDate: string | Date;
    endDate: string | Date;
  }) => {
    return await QcInspectionPaper.findAll({
      attributes: ["timeInspection", "checkList", "planningId"],
      where: {
        timeInspection: { [Op.between]: [startDate, endDate] },
      },
      include: [
        {
          model: PlanningPaper,
          attributes: ["chooseMachine", "shiftManagement"],
          where: paperWhere ?? {},
          required: true,
        },
      ],
      raw: true,
      nest: true,
    });
  },

  getQcInspectionBox: async ({
    boxWhere,
    startDate,
    endDate,
  }: {
    boxWhere: any;
    startDate: string | Date;
    endDate: string | Date;
  }) => {
    return await QcInspectionBox.findAll({
      attributes: ["timeInspection", "checkList"],
      where: { timeInspection: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: PlanningBoxTime,
          as: "PlanningBoxTime",
          attributes: ["machine", "shiftManagement", "planningBoxId"],
          where: boxWhere,
          required: true,
        },
      ],
      raw: true,
      nest: true,
    });
  },

  getReportPlanningPaper: async ({
    startDate,
    endDate,
    paperWhere,
    attributes,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    paperWhere?: any;
    attributes?: string[];
  }) => {
    const defaultAttributes = [
      "planningId",
      "shiftProduction",
      "shiftManagement",
      "dayReport",
      "qtyProduced",
    ];

    const options: any = {
      attributes: attributes ?? defaultAttributes,
      where: {
        dayReport: { [Op.between]: [startDate, endDate] },
      },
      raw: true,
    };

    if (paperWhere) {
      options.include = [
        {
          model: PlanningPaper,
          attributes: ["chooseMachine"],
          where: paperWhere,
          required: true,
        },
      ];
      options.nest = true;
    }

    return await ReportPlanningPaper.findAll(options);
  },

  getReportPlanningBox: async ({
    startDate,
    endDate,
  }: {
    startDate: string | Date;
    endDate: string | Date;
  }) => {
    return await ReportPlanningBox.findAll({
      attributes: ["planningBoxId", "dayReport", "machine", "shiftManagement", "qtyProduced"],
      where: { dayReport: { [Op.between]: [startDate, endDate] } },
      raw: true,
    });
  },

  getPaperRequirement: async (planningIds?: number[]) => {
    const whereCondition: any = {};
    if (planningIds && planningIds.length > 0) {
      whereCondition.planningId = { [Op.in]: planningIds };
    }

    return await PaperRequirements.findAll({
      attributes: ["planningId", [fn("SUM", col("totalRequiredQty")), "totalRequiredQty"]],
      where: whereCondition,
      group: ["planningId"],
      raw: true,
    });
  },
};
