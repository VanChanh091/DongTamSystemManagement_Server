import { col, fn, Op } from "sequelize";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { OrderApproved } from "../../models/order/orderApproved";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { OutboundDetail } from "../../models/warehouse/outbound/outboundDetail";
import { OutboundHistory } from "../../models/warehouse/outbound/outboundHistory";
import { EmployeeBasicInfo } from "../../models/employee/employeeBasicInfo";
import { QcInspectionPaper } from "../../models/qualityControl/qcInspection/qcInspectionPaper";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { ReportPlanningPaper } from "../../models/report/reportPlanningPaper";
import { QcInspectionBox } from "../../models/qualityControl/qcInspection/qcInspectionBox";
import { PlanningBoxTime } from "../../models/planning/planningBoxMachineTime";
import { ReportPlanningBox } from "../../models/report/reportPlanningBox";
import { PaperRequirements } from "../../models/planning/requirement/paperRequirements";

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
      attributes: ["customerId", "dateOutbound", "totalPricePayment"],
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
  // gom nhóm theo ngày duyệt và lấy các đơn được duyệt mới nhất
  getDailyApprovedOrders: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return OrderApproved.findAll({
      attributes: ["orderId", "createdAt"],
      where: {
        action: "APPROVED",
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      include: [
        {
          model: Order,
          required: true,
          attributes: ["totalPrice"],
          where: {
            ...(userId ? { userId } : {}),
            status: { [Op.in]: ["accept", "planning", "completed"] },
          },
        },
      ],
      order: [["approverId", "DESC"]],
      raw: true,
      nest: true,
    });
  },

  //gom nhóm theo ngày nhập kho
  getDailyProductionInbound: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return InboundHistory.findAll({
      attributes: ["totalPrice", "createdAt"],
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Order,
          required: true,
          attributes: [],
          where: {
            ...(userId ? { userId } : {}),
            status: { [Op.in]: ["accept", "planning", "completed"] },
          },
        },
      ],

      raw: true,
    });
  },

  //gom nhóm theo chi tiết xuất kho
  getDailyProductionOutbound: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return OutboundDetail.findAll({
      attributes: ["totalPriceOutbound", "createdAt"],
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Order,
          required: true,
          attributes: [],
          where: {
            ...(userId ? { userId } : {}),
            status: { [Op.in]: ["accept", "planning", "completed"] },
          },
        },
      ],
      raw: true,
    });
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
      attributes: ["customerId", "dateOutbound", "totalPricePayment"],
      where: {
        dateOutbound: { [Op.between]: [startDate, endDate] },
        totalPricePayment: { [Op.gt]: 0 },
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
    hasErrorOnly = false,
  }: {
    paperWhere: any;
    startDate: string | Date;
    endDate: string | Date;
    hasErrorOnly?: boolean;
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
