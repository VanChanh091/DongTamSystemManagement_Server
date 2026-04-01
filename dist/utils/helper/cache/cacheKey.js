"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKey = void 0;
exports.CacheKey = {
    order: {
        pendingReject: (role) => `orders:${role}:pending_reject`,
        acceptPlanning: (role, page) => `orders:${role}:accept_planning:page:${page}`,
        lastUpdatedPending: "order:pending_reject:lastUpdated",
        lastUpdatedAccept: "order:accept_planning:lastUpdated",
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
        stop: {
            page: (page) => `planningPaper:stop:page:${page}`,
            lastUpdated: "planningStop:lastUpdated",
        },
        box: {
            machine: (machine) => `planningBox:machine:${machine}`,
            lastUpdated: "planningBox:lastUpdated",
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
        inventory: {
            page: (page) => `inventory:page:${page}`,
            lastUpdated: "inventories:lastUpdated",
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
    },
    dashboard: {
        planning: {
            all: (status, page) => `dashboard:planning:${status}:${page}`,
            lastUpdated: "db:planning:lastUpdated", //planning paper
        },
        details: {
            all: (planningId) => `dashboard:detail:${planningId}`,
            lastUpdated: "db:detail:lastUpdated", //box time machine
        },
    },
};
//# sourceMappingURL=cacheKey.js.map