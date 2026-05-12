import dotenv from "dotenv";
dotenv.config();

import { CacheKey } from "./cacheKey";
import { checkLastChange } from "./checkLastChangeHelper";
import redisCache from "../../../assets/configs/connect/redis.connect";

const devEnvironment = process.env.NODE_ENV !== "production";

//map cache để xóa cache theo module
const CACHE_CONFIG = {
  customer: ["customers:"],
  product: ["products:"],
  employee: ["employees:"],

  //order
  orderPendingReject: (role: string) => [`orders:${role}:pending_reject`],
  orderAcceptted: (role: string) => ({ prefixes: [`orders:${role}:accept:`] }),

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
  estimate: ["estimate:"],
  schedule: ["schedule:"],
};

export const CacheManager = {
  //Xóa cache theo prefix
  async clearByPrefix(prefix: string) {
    const keys = await redisCache.keys(`${prefix}*`);
    //console.log(keys);

    if (keys.length > 0) {
      await redisCache.del(...keys);
      if (devEnvironment) console.log(`🧹 Cleared ${keys.length} keys for prefix: ${prefix}`);
    }
  },

  /**
   * @param module Tên module cần xóa (key trong CACHE_CONFIG)
   * @param args Tham số phụ (ví dụ: role)
   */
  async clear(module: keyof typeof CACHE_CONFIG, ...args: any[]) {
    const config = CACHE_CONFIG[module];
    if (!config) return;

    let prefixes: string[] = [];
    let extraKeys: string[] = [];

    // Xử lý nếu config là function (dành cho module có tham số như role)
    const resolveConfig = typeof config === "function" ? (config as any)(...args) : config;

    if (Array.isArray(resolveConfig)) {
      prefixes = resolveConfig;
    } else {
      prefixes = resolveConfig.prefixes || [];
      extraKeys = resolveConfig.extraKeys || [];
    }

    // Thực hiện xóa theo prefix
    await Promise.all(prefixes.map((p) => this.clearByPrefix(p)));

    // Thực hiện xóa các key cụ thể (nếu có)
    if (extraKeys.length > 0) {
      await redisCache.del(...extraKeys);
    }
  },

  /** Check lastChange cho 1 module */
  async check(models: any, module: string, options: { setCache?: boolean } = {}) {
    const { setCache = true } = options;

    const map: Record<string, string> = {
      customer: CacheKey.customer.lastUpdated,
      product: CacheKey.product.lastUpdated,
      employee: CacheKey.employee.lastUpdated,

      //order
      orderPending: CacheKey.order.lastUpdatedPending,
      orderAccept: CacheKey.order.lastUpdatedAccept,

      //planning
      planningOrder: CacheKey.planning.order.lastUpdated,
      planningPaper: CacheKey.planning.paper.lastUpdated,
      planningOrderPaper: CacheKey.planning.paper.lastUpdated, //using for cache planning order
      planningStop: CacheKey.planning.stop.lastUpdated,
      planningBox: CacheKey.planning.box.lastUpdated,

      //manufacture
      manufacturePaper: CacheKey.manufacture.paper.lastUpdated,
      manufactureBox: CacheKey.manufacture.box.lastUpdated,

      //report
      reportPaper: CacheKey.report.paper.lastUpdated,
      reportBox: CacheKey.report.box.lastUpdated,

      //dashboard
      dbPlanning: CacheKey.dashboard.planning.lastUpdated,

      //waiting check
      checkPaper: CacheKey.waitingCheck.paper.lastUpdated,
      checkBox: CacheKey.waitingCheck.box.lastUpdated,

      //warehouse
      inbound: CacheKey.warehouse.inbound.lastUpdated,
      outbound: CacheKey.warehouse.outbound.lastUpdated,
      inventory: CacheKey.warehouse.inventory.lastUpdated,

      //delivery
      estimate: CacheKey.delivery.estimate.lastUpdated,
      schedule: CacheKey.delivery.schedule.lastUpdated,
    };

    const key = map[module];
    if (!key) throw new Error(`Invalid module for checkLastChange: ${module}`);

    const result = await checkLastChange(models, key, { setCache });
    // console.log(`🕒 Cache check [${module}]:`, result);

    return result;
  },
};
