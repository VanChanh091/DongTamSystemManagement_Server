"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKey = void 0;
exports.CacheKey = {
    order: {
        pendingReject: (role, ownOnly) => `orders:${role}:ownOnly:${ownOnly}:pending_reject`,
        accept: (role, ownOnly) => `orders:${role}:ownOnly:${ownOnly}:accept`,
        lastUpdatedPending: "order:pending_reject:lastUpdated",
        lastUpdatedAccept: "order:accept:lastUpdated",
    },
    customer: {
        all: "customers:all",
        page: (page) => `customers:page:${page}`,
        lastUpdated: "customer:lastUpdated",
    },
    product: {
        all: "products:all",
        page: (page) => `products:page:${page}`,
        lastUpdated: "product:lastUpdated",
    },
    employee: {
        all: "employees:all",
        page: (page) => `employees:page:${page}`,
        lastUpdated: "employee:lastUpdated",
    },
    planning: {
        order: {
            all: "orders:status:accept",
            lastUpdated: "orders:accept:lastUpdated",
        },
        paper: {
            machine: (machine) => `planningPaper:machine:${machine}`,
            lastUpdated: "planningPaper:lastUpdated",
        },
        box: {
            machine: (machine) => `planningBox:machine:${machine}`,
            lastUpdated: "planningBox:lastUpdated",
        },
        stop: {
            page: (page) => `planningPaper:stop:page:${page}`,
            lastUpdated: "planningStop:lastUpdated",
        },
        paperRequirement: {
            machine: (machine) => `paperRequirement:machine:${machine}`,
            lastUpdated: "paperRequirement:lastUpdated",
        },
    },
    manufacture: {
        paper: {
            machine: (machine) => `manufacturePaper:machine:${machine}`,
            lastUpdated: "manufacturePaper:lastUpdated",
        },
        box: {
            machine: (machine) => `manufactureBox:machine:${machine}`,
            lastUpdated: "manufactureBoxs:lastUpdated",
        },
    },
    waitingCheck: {
        paper: { all: "waitingCheck:Paper:all", lastUpdated: "checkPaper:lastUpdated" },
        box: { all: "waitingCheck:Box:all", lastUpdated: "checkBox:lastUpdated" },
    },
    warehouse: {
        inbound: {
            page: (page) => `inboundHistory:page:${page}`,
            lastUpdated: "inbound:lastUpdated",
        },
        outbound: {
            page: (page) => `outboundHistory:page:${page}`,
            lastUpdated: "outbound:lastUpdated",
        },
        inventory_gt: {
            page: (page) => `inventory:gt:page:${page}`,
            lastUpdated: "inventories:gt:lastUpdated",
        },
        inventory_lt: {
            page: (page) => `inventory:lt:page:${page}`,
            lastUpdated: "inventories:lt:lastUpdated",
        },
    },
    delivery: {
        estimate: {
            page: (page) => `estimate:page:${page}`,
            lastUpdated: "estimateOrder:lastUpdated",
        },
        schedule: {
            date: (date) => `schedule:date:${date.toISOString()}`,
            lastUpdated: "scheduleOrder:lastUpdated",
        },
    },
    report: {
        paper: {
            all: (machine, page) => `reportPaper:planning:${machine}:${page}`,
            lastUpdated: "report:paper:lastUpdated",
        },
        box: {
            all: (machine, page) => `reportBox:planning:${machine}:${page}`,
            lastUpdated: "report:box:lastUpdated",
        },
        scrap: {
            all: (machine, status, page) => `reportScrap:${machine}:${status}:${page}`,
            lastUpdated: "scrap:report:lastUpdated",
        },
    },
    synthetic: {
        planning: {
            all: (status, page) => `syntheticPlanning:${status}:${page}`,
            lastUpdated: "synthetic:planning:lastUpdated", //planning paper
        },
        order: {
            all: (status, page) => `syntheticOrder:${status}:${page}`,
            lastUpdated: "synthetic:order:lastUpdated",
        },
        reports: {
            //revenue
            revenue_daily: (year, month, key) => `report:revenue_daily:${year}-${month}:${key}`,
            revenue_monthly: (year, month, key) => `report:revenue_monthly:${year}-${month}:${key}`,
            revenue_yearly: (fromYear, toYear, key) => `report:revenue_yearly:${fromYear}-${toYear}:${key}`,
            //error production
            error_monthly: (year, month, type) => `report:error_monthly:${year}-${month}_type:${type}`,
            error_yearly: (year, type) => `report:error_yearly:${year}_type:${type}`,
        },
    },
    qcInspection: {
        paper: {
            page: (machine, page) => `inspection:paper:${machine}:${page}`,
            lastUpdated: "qcInspectionPaper:lastUpdated",
        },
    },
};
//# sourceMappingURL=cacheKey.js.map