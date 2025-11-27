"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const redisCache_1 = __importDefault(require("../../configs/redisCache"));
const checkLastChangeHelper_1 = require("./checkLastChangeHelper");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
exports.CacheManager = {
    keys: {
        customer: {
            all: "customers:all",
            page: (page) => `customers:page:${page}`,
            search: "customers:search:all",
            lastUpdated: "customer:lastUpdated",
        },
        dashboard: {
            planning: {
                all: (page) => `dashboard:planning:all:${page}`,
                lastUpdated: "db:planning:lastUpdated", //planning paper
            },
            details: {
                all: (planningId) => `dashboard:detail:${planningId}`,
                lastUpdated: "db:detail:lastUpdated", //box time machine
            },
            search: "dashboard:search:all",
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
        order: {
            pendingReject: (role) => `orders:${role}:pending_reject`,
            acceptPlanning: (role, page) => `orders:${role}:accept_planning:page:${page}`,
            searchAcceptPlanning: "orders:accept_planning",
            lastUpdatedPending: "order:pending_reject:lastUpdated",
            lastUpdatedAccept: "order:accept_planning:lastUpdated",
        },
        //planning và manufacture dùng chung cache
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
                lastUpdated: "planningPaper:stop:lastUpdated",
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
        report: {
            paper: {
                all: (page) => `reportPaper:page:${page}`,
                search: "reportPaper:search:all",
                lastUpdated: "report:paper:lastUpdated",
            },
            box: {
                all: (page) => `reportBox:page:${page}`,
                search: "reportBox:search:all",
                lastUpdated: "report:box:lastUpdated",
            },
        },
    },
    // Xóa toàn bộ cache theo prefix
    async clearByPrefix(prefix) {
        const keys = await redisCache_1.default.keys(`${prefix}*`);
        // console.log(keys);
        if (keys.length > 0) {
            await redisCache_1.default.del(...keys);
            if (devEnvironment)
                console.log(`🧹 Cleared ${keys.length} keys for prefix: ${prefix}`);
        }
    },
    //   Xóa cache cho nhóm cụ thể
    async clearCustomer() {
        await this.clearByPrefix("customers:");
    },
    async clearProduct() {
        await this.clearByPrefix("products:");
    },
    async clearEmployee() {
        await this.clearByPrefix("employees:");
    },
    async clearOrderAcceptPlanning(role) {
        await this.clearByPrefix(`orders:${role}:accept_planning:`);
        // Xoá cache tìm kiếm accept
        await redisCache_1.default.del(this.keys.order.searchAcceptPlanning);
    },
    async clearOrderPendingReject(role) {
        await this.clearByPrefix(`orders:${role}:pending_reject`);
    },
    async clearOrderAccept() {
        await this.clearByPrefix("orders:status:accept");
    },
    async clearPlanningPaper() {
        await this.clearByPrefix("planningPaper:machine:");
        await this.clearByPrefix("planningPaper:search:");
    },
    async clearPlanningStop() {
        await this.clearByPrefix("planningPaper:stop:");
    },
    async clearPlanningBox() {
        await this.clearByPrefix("planningBox:machine:");
        await this.clearByPrefix("planningBox:search:");
    },
    async clearManufacturePaper() {
        await this.clearByPrefix("manufacturePaper:machine:");
    },
    async clearManufactureBox() {
        await this.clearByPrefix("manufactureBox:machine:");
    },
    async clearReportPaper() {
        await this.clearByPrefix("reportPaper:");
    },
    async clearReportBox() {
        await this.clearByPrefix("reportBox:");
    },
    async clearDbPlanning() {
        await this.clearByPrefix("dashboard:planning:all:");
    },
    async clearDbPlanningDetail() {
        await this.clearByPrefix("dashboard:detail:");
    },
    /** Check lastChange cho 1 module */
    async check(models, module, options = {}) {
        const { setCache = true } = options;
        const map = {
            customer: this.keys.customer.lastUpdated,
            product: this.keys.product.lastUpdated,
            employee: this.keys.employee.lastUpdated,
            orderPending: this.keys.order.lastUpdatedPending,
            orderAccept: this.keys.order.lastUpdatedAccept,
            planningOrder: this.keys.planning.order.lastUpdated,
            planningPaper: this.keys.planning.paper.lastUpdated,
            planningOrderPaper: this.keys.planning.paper.lastUpdated, //using for cache planning order
            planningStop: this.keys.planning.stop.lastUpdated,
            planningBox: this.keys.planning.box.lastUpdated,
            manufacturePaper: this.keys.manufacture.paper.lastUpdated,
            manufactureBox: this.keys.manufacture.box.lastUpdated,
            reportPaper: this.keys.report.paper.lastUpdated,
            reportBox: this.keys.report.box.lastUpdated,
            dbPlanning: this.keys.dashboard.planning.lastUpdated,
            dbDetail: this.keys.dashboard.details.lastUpdated,
        };
        const key = map[module];
        if (!key)
            throw new Error(`Invalid module for checkLastChange: ${module}`);
        const result = await (0, checkLastChangeHelper_1.checkLastChange)(models, key, { setCache });
        // console.log(`🕒 Cache check [${module}]:`, result);
        return result;
    },
};
//# sourceMappingURL=cacheManager.js.map