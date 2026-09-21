"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meiliTransformer = void 0;
const dayjs_config_1 = require("../dayjs/dayjs.config");
exports.meiliTransformer = {
    customer: (customer) => {
        const raw = customer.get({ plain: true });
        const createdAtTimestamp = raw.createdAt
            ? dayjs_config_1.dayjsUtc.utc(raw.createdAt).startOf("day").unix()
            : null;
        return {
            ...raw,
            createdAt: createdAtTimestamp,
        };
    },
    employee: (employee) => {
        const raw = employee.get({ plain: true });
        return {
            employeeId: raw.employeeId,
            fullName: raw.fullName,
            phoneNumber: raw.phoneNumber,
            employeeCode: raw.companyInfo.employeeCode,
            status: raw.companyInfo.status,
        };
    },
    order: (order) => {
        const raw = order.get({ plain: true });
        const dayReceiveOrderTimestamp = raw.dayReceiveOrder
            ? dayjs_config_1.dayjsUtc.utc(raw.dayReceiveOrder).startOf("day").unix()
            : null;
        return {
            //search
            orderId: raw.orderId,
            dayReceiveOrder: dayReceiveOrderTimestamp,
            flute: raw.flute,
            QC_box: raw.QC_box,
            customerName: raw.Customer?.customerName,
            productName: raw.Product?.productName,
            fullName: raw.User?.fullName,
            //filterable
            status: raw.status,
            userId: raw.userId,
            orderSortValue: raw.orderSortValue,
        };
    },
    planningPaper: (paper) => {
        const raw = paper.get({ plain: true });
        return {
            planningId: raw.planningId,
            orderId: raw.Order?.orderId,
            userId: raw.Order?.userId,
            status: raw.status,
            ghepKho: raw.ghepKho,
            chooseMachine: raw.chooseMachine,
            deliveryPlanned: raw.deliveryPlanned,
            customerName: raw.Order?.Customer?.customerName,
        };
    },
    planningBox: (paper) => {
        const raw = paper.get({ plain: true });
        return {
            planningBoxId: raw.planningBoxId,
            orderId: raw.Order?.orderId,
            QC_box: raw.Order?.QC_box,
            customerName: raw.Order?.Customer?.customerName,
            boxTimes: raw.boxTimes.map((boxTime) => ({
                machine: boxTime.machine,
                status: boxTime.status,
            })),
        };
    },
    scrapReport: (db) => {
        const raw = db.get({ plain: true });
        const reportedAtTimestamp = raw.reportedAt
            ? dayjs_config_1.dayjsUtc.utc(raw.reportedAt).startOf("day").unix()
            : null;
        return {
            scrapId: raw.scrapId,
            reportedBy: raw.reportedBy,
            reportedAt: reportedAtTimestamp,
            status: raw.status,
        };
    },
    reportPaper: (db) => {
        const raw = db.get({ plain: true });
        const dayReportTimestamp = raw.dayReport
            ? dayjs_config_1.dayjsUtc.utc(raw.dayReport).startOf("day").unix()
            : null;
        return {
            reportPaperId: raw.reportPaperId,
            dayReported: dayReportTimestamp,
            shiftManagement: raw.shiftManagement,
            chooseMachine: raw.PlanningPaper?.chooseMachine,
            orderId: raw.PlanningPaper?.Order?.orderId,
            customerName: raw.PlanningPaper?.Order?.Customer?.customerName,
        };
    },
    reportBox: (db) => {
        const raw = db.get({ plain: true });
        const dayReportTimestamp = raw.dayReport
            ? dayjs_config_1.dayjsUtc.utc(raw.dayReport).startOf("day").unix()
            : null;
        return {
            reportBoxId: raw.reportBoxId,
            dayReported: dayReportTimestamp,
            shiftManagement: raw.shiftManagement,
            machine: raw.machine,
            orderId: raw.PlanningBox?.Order?.orderId,
            QC_box: raw.PlanningBox?.Order?.QC_box,
            customerName: raw.PlanningBox?.Order?.Customer?.customerName,
        };
    },
    inbound: (db) => {
        const raw = db.get({ plain: true });
        const dateInboundTimestamp = raw.dateInbound
            ? dayjs_config_1.dayjsUtc.utc(raw.dateInbound).startOf("day").unix()
            : null;
        return {
            inboundId: raw.inboundId,
            dateInbound: dateInboundTimestamp,
            orderId: raw.Order?.orderId,
            customerName: raw.Order?.Customer?.customerName,
            checkedBy: raw.QcSession?.checkedBy,
        };
    },
    outbound: (db) => {
        const raw = db.get({ plain: true });
        const dateOutboundTimestamp = raw.dateOutbound
            ? dayjs_config_1.dayjsUtc.utc(raw.dateOutbound).startOf("day").unix()
            : null;
        return {
            outboundId: raw.outboundId,
            dateOutbound: dateOutboundTimestamp,
            outboundSlipCode: raw.outboundSlipCode,
            status: raw.status,
            customerName: raw.detail?.[0]?.Order?.Customer?.customerName,
        };
    },
    inventory: (db) => {
        const raw = db.get({ plain: true });
        const order = raw.Order;
        return {
            inventoryId: raw.inventoryId,
            qtyInventory: raw.qtyInventory,
            orderId: order?.orderId,
            customerName: order?.Customer?.customerName,
            fullName: order?.User?.fullName,
        };
    },
    deliveryRequest: (db) => {
        const raw = db.get({ plain: true });
        const order = raw.PlanningPaper?.Order;
        return {
            requestId: raw.requestId,
            status: raw.status,
            orderId: order?.orderId,
            customerName: order?.Customer?.customerName,
            fullName: raw.User?.fullName,
        };
    },
    dashboard: (db) => {
        const raw = db.get({ plain: true });
        return {
            planningId: raw.planningId,
            ghepKho: raw.ghepKho,
            status: raw.status,
            chooseMachine: raw.chooseMachine,
            orderId: raw.Order?.orderId,
            customerName: raw.Order?.Customer?.customerName,
            companyName: raw.Order?.Customer?.companyName,
            fullName: raw.Order?.User?.fullName,
        };
    },
};
//# sourceMappingURL=meiliTransformer.js.map