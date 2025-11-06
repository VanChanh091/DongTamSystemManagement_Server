import redisCache from "../../configs/redisCache.js";
import { checkLastChange } from "./checkLastChangeHelper.js";
import dotenv from "dotenv";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";

export const CacheManager = {
  keys: {
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
        lastUpdated: "planningPaper:lastUpdated",
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
        machine: (machine) => `manufactureBoxs:machine:${machine}`,
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
    const keys = await redisCache.keys(`${prefix}*`);
    // console.log(keys);

    if (keys.length > 0) {
      await redisCache.del(...keys);
      if (devEnvironment) console.log(`🧹 Cleared ${keys.length} keys for prefix: ${prefix}`);
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
    await redisCache.del(this.keys.order.searchAcceptPlanning);
  },

  async clearOrderPendingReject(role) {
    await this.clearByPrefix(`orders:${role}:pending_reject`);
  },

  async clearOrderAccept() {
    await this.clearByPrefix("orders:status:accept");
  },

  async clearPlanningPaper() {
    await this.clearByPrefix("planningPaper:machine:");
  },

  async clearPlanningBox() {
    await this.clearByPrefix("planningBox:machine:");
  },

  async clearManufacturePaper() {
    await this.clearByPrefix("`manufacturePaper:machine:");
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
      planningBox: this.keys.planning.box.lastUpdated,
      manufacturePaper: this.keys.manufacture.paper.lastUpdated,
      manufactureBox: this.keys.manufacture.box.lastUpdated,
      reportPaper: this.keys.report.paper.lastUpdated,
      reportBox: this.keys.report.box.lastUpdated,
    };

    const key = map[module];
    if (!key) throw new Error(`Invalid module for checkLastChange: ${module}`);

    const result = await checkLastChange(models, key, { setCache });
    // console.log(`🕒 Cache check [${module}]:`, result);

    return result;
  },
};
