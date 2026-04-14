"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meiliTransformer = void 0;
exports.meiliTransformer = {
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
        return {
            //search
            orderId: raw.orderId,
            flute: raw.flute,
            QC_box: raw.QC_box,
            price: raw.price,
            customerName: raw.Customer?.customerName,
            productName: raw.Product?.productName,
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
            ghepKho: raw.ghepKho,
            orderId: raw.orderId,
            chooseMachine: raw.chooseMachine,
            status: raw.status,
            customerName: raw.Order?.Customer?.customerName,
            productName: raw.Order?.Product?.productName,
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
    reportPaper: (db) => {
        const raw = db.get({ plain: true });
        return {
            reportPaperId: raw.reportPaperId,
            dayReported: raw.dayReport,
            shiftManagement: raw.shiftManagement,
            chooseMachine: raw.PlanningPaper?.chooseMachine,
            orderId: raw.PlanningPaper?.Order?.orderId,
            customerName: raw.PlanningPaper?.Order?.Customer?.customerName,
        };
    },
    reportBox: (db) => {
        const raw = db.get({ plain: true });
        return {
            reportBoxId: raw.reportBoxId,
            dayReported: raw.dayReport,
            shiftManagement: raw.shiftManagement,
            machine: raw.machine,
            orderId: raw.PlanningBox?.Order?.orderId,
            QC_box: raw.PlanningBox?.Order?.QC_box,
            customerName: raw.PlanningBox?.Order?.Customer?.customerName,
        };
    },
    inbound: (db) => {
        const raw = db.get({ plain: true });
        return {
            inboundId: raw.inboundId,
            dateInbound: raw.dateInbound,
            orderId: raw.Order?.orderId,
            customerName: raw.Order?.Customer?.customerName,
            checkedBy: raw.QcSession?.checkedBy,
        };
    },
    outbound: (db) => {
        const raw = db.get({ plain: true });
        return {
            outboundId: raw.outboundId,
            dateOutbound: raw.dateOutbound,
            outboundSlipCode: raw.outboundSlipCode,
            customerName: raw.detail?.[0]?.Order?.Customer?.customerName,
        };
    },
    inventory: (db) => {
        const raw = db.get({ plain: true });
        return {
            inventoryId: raw.inventoryId,
            orderId: raw.Order?.orderId,
            customerName: raw.Order?.Customer?.customerName,
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