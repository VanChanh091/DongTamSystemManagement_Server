"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisCache_1 = __importDefault(require("../../../assest/configs/redisCache"));
const cacheKey_1 = require("./cacheKey");
const checkLastChangeHelper_1 = require("../checkLastChangeHelper");
const devEnvironment = process.env.NODE_ENV !== "production";
const CACHE_CONFIG = {
    customer: ["customers:"],
    product: ["products:"],
    employee: ["employees:"],
    //order
    orderPendingReject: (role) => [`orders:${role}:pending_reject`],
    orderAcceptPlanning: (role) => ({
        prefixes: [`orders:${role}:accept_planning:`],
        extraKeys: [cacheKey_1.CacheKey.order.searchAcceptPlanning],
    }),
    //planning
    orderAccept: ["orders:status:accept"],
    planningPaper: ["planningPaper:machine:", "planningPaper:search:"],
    planningStop: ["planningPaper:stop:"],
    planningBox: ["planningBox:machine:", "planningBox:search:"],
    //manufacture
    manufacturePaper: ["manufacturePaper:machine:"],
    manufactureBox: ["manufactureBox:machine:"],
    // report
    reportPaper: ["reportPaper:"],
    reportBox: ["reportBox:"],
    //dashboard
    dbPlanning: ["dashboard:planning:", "dashboard:search:all"],
    dbPlanningDetail: ["dashboard:detail:"],
    //waiting check
    checkPaper: ["waitingCheck:Paper:all"],
    checkBox: ["waitingCheck:Box:all"],
    //warehouse
    inbound: ["inboundHistory:"],
    outbound: ["outboundHistory:"],
    inventory: ["inventory:"],
    //delivery
    register: ["register:page:"],
    schedule: ["deliverySchedule:"],
};
exports.CacheManager = {
    //Xóa toàn bộ cache theo prefix
    async clearByPrefix(prefix) {
        const keys = await redisCache_1.default.keys(`${prefix}*`);
        //console.log(keys);
        if (keys.length > 0) {
            await redisCache_1.default.del(...keys);
            if (devEnvironment)
                console.log(`🧹 Cleared ${keys.length} keys for prefix: ${prefix}`);
        }
    },
    /**
     * Hàm clear tổng quát thay thế cho tất cả các hàm clear đơn lẻ
     * @param module Tên module cần xóa (key trong CACHE_CONFIG)
     * @param args Tham số phụ (ví dụ: role)
     */
    async clear(module, ...args) {
        const config = CACHE_CONFIG[module];
        if (!config)
            return;
        let prefixes = [];
        let extraKeys = [];
        // Xử lý nếu config là function (dành cho module có tham số như role)
        const resolveConfig = typeof config === "function" ? config(...args) : config;
        if (Array.isArray(resolveConfig)) {
            prefixes = resolveConfig;
        }
        else {
            prefixes = resolveConfig.prefixes || [];
            extraKeys = resolveConfig.extraKeys || [];
        }
        // Thực hiện xóa theo prefix
        await Promise.all(prefixes.map((p) => this.clearByPrefix(p)));
        // Thực hiện xóa các key cụ thể (nếu có)
        if (extraKeys.length > 0) {
            await redisCache_1.default.del(...extraKeys);
        }
    },
    /** Check lastChange cho 1 module */
    async check(models, module, options = {}) {
        const { setCache = true } = options;
        const map = {
            customer: cacheKey_1.CacheKey.customer.lastUpdated,
            product: cacheKey_1.CacheKey.product.lastUpdated,
            employee: cacheKey_1.CacheKey.employee.lastUpdated,
            //order
            orderPending: cacheKey_1.CacheKey.order.lastUpdatedPending,
            orderAccept: cacheKey_1.CacheKey.order.lastUpdatedAccept,
            //planning
            planningOrder: cacheKey_1.CacheKey.planning.order.lastUpdated,
            planningPaper: cacheKey_1.CacheKey.planning.paper.lastUpdated,
            planningOrderPaper: cacheKey_1.CacheKey.planning.paper.lastUpdated, //using for cache planning order
            planningStop: cacheKey_1.CacheKey.planning.stop.lastUpdated,
            planningBox: cacheKey_1.CacheKey.planning.box.lastUpdated,
            //manufacture
            manufacturePaper: cacheKey_1.CacheKey.manufacture.paper.lastUpdated,
            manufactureBox: cacheKey_1.CacheKey.manufacture.box.lastUpdated,
            //report
            reportPaper: cacheKey_1.CacheKey.report.paper.lastUpdated,
            reportBox: cacheKey_1.CacheKey.report.box.lastUpdated,
            //dashboard
            dbPlanning: cacheKey_1.CacheKey.dashboard.planning.lastUpdated,
            dbDetail: cacheKey_1.CacheKey.dashboard.details.lastUpdated,
            //waiting check
            checkPaper: cacheKey_1.CacheKey.waitingCheck.paper.lastUpdated,
            checkBox: cacheKey_1.CacheKey.waitingCheck.box.lastUpdated,
            //warehouse
            inbound: cacheKey_1.CacheKey.warehouse.inbound.lastUpdated,
            outbound: cacheKey_1.CacheKey.warehouse.outbound.lastUpdated,
            inventory: cacheKey_1.CacheKey.warehouse.inventory.lastUpdated,
            //delivery
            registerOrder: cacheKey_1.CacheKey.delivery.register.lastUpdated,
            schedule: cacheKey_1.CacheKey.delivery.schedule.lastUpdated,
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