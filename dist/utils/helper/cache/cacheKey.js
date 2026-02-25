"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKey = void 0;
exports.CacheKey = {
    order: {
        pendingReject: (role) => `orders:${role}:pending_reject`,
        acceptPlanning: (role, page) => `orders:${role}:accept_planning:page:${page}`,
        searchAcceptPlanning: "orders:accept_planning",
        lastUpdatedPending: "order:pending_reject:lastUpdated",
        lastUpdatedAccept: "order:accept_planning:lastUpdated",
    },
    customer: {
        all: "customers:all",
        page: (page) => `customers:page:${page}`,
        search: "customers:search:all",
        lastUpdated: "customer:lastUpdated",
    },
    product: {
        all: "products:all",
        page: (page) => `products:page:${page}`,
        search: "products:search:all",
        lastUpdated: "product:lastUpdated",
    },
    employee: {
        all: "employees:all",
        page: (page) => `employees:page:${page}`,
        search: "employees:search:all",
        lastUpdated: "employee:lastUpdated",
    },
    planning: {
        order: {
            all: "orders:status:accept",
            lastUpdated: "orders:accept:lastUpdated",
        },
        paper: {
            machine: (machine) => `planningPaper:machine:${machine}`,
            search: (machine) => `planningPaper:search:${machine}`,
            lastUpdated: "planningPaper:lastUpdated",
        },
        stop: {
            page: (page) => `planningPaper:stop:page:${page}`,
            lastUpdated: "planningStop:lastUpdated",
        },
        box: {
            machine: (machine) => `planningBox:machine:${machine}`,
            search: (machine) => `planningBox:search:${machine}`,
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
            search: (page) => `inboundHistory:search:${page}`,
            lastUpdated: "inbound:lastUpdated",
        },
        outbound: {
            page: (page) => `outboundHistory:page:${page}`,
            search: (page) => `outboundHistory:search:${page}`,
            lastUpdated: "outbound:lastUpdated",
        },
        inventory: {
            page: (page) => `inventory:page:${page}`,
            lastUpdated: "inventories:lastUpdated",
        },
    },
    delivery: {
        register: {
            page: (page) => `register:page:${page}`,
            lastUpdated: "registerOrder:lastUpdated",
        },
        schedule: {
            date: (date) => `deliverySchedule:date:${date.toISOString()}`,
            lastUpdated: "schedule:lastUpdated",
        },
    },
    report: {
        paper: {
            all: (machine, page) => `reportPaper:planning:${machine}:${page}`,
            search: (machine) => `reportPaper:search:${machine}`,
            lastUpdated: "report:paper:lastUpdated",
        },
        box: {
            all: (machine, page) => `reportBox:planning:${machine}:${page}`,
            search: (machine) => `reportBox:search:${machine}`,
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
        search: "dashboard:search:all",
    },
};
//# sourceMappingURL=cacheKey.js.map