"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meiliTransformer = exports.toVnStartOfDayUnix = void 0;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const VN_OFFSET_SEC = 7 * 3600;
const toVnStartOfDayUnix = (date) => {
    if (!date)
        return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime()))
        return null;
    const vnTime = new Date(d.getTime() + VN_OFFSET_MS);
    const utcDayStartMs = Date.UTC(vnTime.getUTCFullYear(), vnTime.getUTCMonth(), vnTime.getUTCDate());
    return Math.floor(utcDayStartMs / 1000) - VN_OFFSET_SEC;
};
exports.toVnStartOfDayUnix = toVnStartOfDayUnix;
exports.meiliTransformer = {
    customer: (customer) => {
        const raw = customer.get({ plain: true });
        const createdAtTimestamp = raw.createdAt
            ? (0, exports.toVnStartOfDayUnix)(raw.createdAt)
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
            ? (0, exports.toVnStartOfDayUnix)(raw.dayReceiveOrder)
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
    //planning
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
            ? (0, exports.toVnStartOfDayUnix)(raw.reportedAt)
            : null;
        return {
            scrapId: raw.scrapId,
            reportedBy: raw.reportedBy,
            reportedAt: reportedAtTimestamp,
            status: raw.status,
        };
    },
    //report
    reportPaper: (db) => {
        const raw = db.get({ plain: true });
        const dayReportTimestamp = raw.dayReport
            ? (0, exports.toVnStartOfDayUnix)(raw.dayReport)
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
            ? (0, exports.toVnStartOfDayUnix)(raw.dayReport)
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
    //inbound & outbound
    inbound: (db) => {
        const raw = db.get({ plain: true });
        const dateInboundTimestamp = raw.dateInbound
            ? (0, exports.toVnStartOfDayUnix)(raw.dateInbound)
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
            ? (0, exports.toVnStartOfDayUnix)(raw.dateOutbound)
            : null;
        return {
            outboundId: raw.outboundId,
            dateOutbound: dateOutboundTimestamp,
            outboundSlipCode: raw.outboundSlipCode,
            status: raw.status,
            customerName: raw.detail?.[0]?.Order?.Customer?.customerName,
        };
    },
    //inventory
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
    invWipSheet: (db) => {
        const raw = db.get({ plain: true });
        const order = raw.Order;
        const createdAtTimestamp = raw.createdAt
            ? (0, exports.toVnStartOfDayUnix)(raw.createdAt)
            : null;
        return {
            wipSheetId: raw.wipSheetId,
            orderId: raw.orderId,
            customerName: order?.Customer?.customerName,
            qtyRemaining: raw.qtyRemaining,
            createdAt: createdAtTimestamp,
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
    // inspection paper and box
    inspectionPaper: (db) => {
        const raw = db.get({ plain: true });
        const paper = raw.PlanningPaper;
        const customer = paper?.Order?.Customer;
        return {
            inspecPaperId: raw.inspecPaperId,
            orderId: paper?.orderId,
            customerName: customer?.customerName,
            checkedBy: raw.checkedBy,
            machine: paper?.chooseMachine,
        };
    },
    inspectionBox: (db) => {
        const raw = db.get({ plain: true });
        const box = raw.PlanningBoxTime?.PlanningBox;
        const customer = box?.Order?.Customer;
        return {
            inspecBoxId: raw.inspecBoxId,
            orderId: box?.orderId,
            customerName: customer?.customerName,
            checkedBy: raw.checkedBy,
            machine: raw.PlanningBoxTime?.machine,
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