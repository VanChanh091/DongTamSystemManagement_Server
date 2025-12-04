import redisCache from "../../configs/redisCache";
import { checkLastChange } from "./checkLastChangeHelper";
import dotenv from "dotenv";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";

export const CacheManager = {
  keys: {
    customer: {
      all: "customers:all",
      page: (page: number) => `customers:page:${page}`,
      search: "customers:search:all",
      lastUpdated: "customer:lastUpdated",
    },

    dashboard: {
      planning: {
        all: (status: string, page: number) => `dashboard:planning:${status}:${page}`,
        lastUpdated: "db:planning:lastUpdated", //planning paper
      },
      details: {
        all: (planningId: number) => `dashboard:detail:${planningId}`,
        lastUpdated: "db:detail:lastUpdated", //box time machine
      },
      search: "dashboard:search:all",
    },

    product: {
      all: "products:all",
      page: (page: number) => `products:page:${page}`,
      search: "products:search:all",
      lastUpdated: "product:lastUpdated",
    },

    employee: {
      all: "employees:all",
      page: (page: number) => `employees:page:${page}`,
      search: "employees:search:all",
      lastUpdated: "employee:lastUpdated",
    },

    order: {
      pendingReject: (role: string) => `orders:${role}:pending_reject`,
      acceptPlanning: (role: string, page: number) => `orders:${role}:accept_planning:page:${page}`,
      searchAcceptPlanning: "orders:accept_planning",
      lastUpdatedPending: "order:pending_reject:lastUpdated",
      lastUpdatedAccept: "order:accept_planning:lastUpdated",
    },

    planning: {
      order: {
        all: "orders:status:accept",
        lastUpdated: "orders:accept:lastUpdated",
      },
      paper: {
        machine: (machine: string) => `planningPaper:machine:${machine}`,
        search: (machine: string) => `planningPaper:search:${machine}`,
        lastUpdated: "planningPaper:lastUpdated",
      },
      stop: {
        page: (page: number) => `planningPaper:stop:page:${page}`,
        lastUpdated: "planningPaper:stop:lastUpdated",
      },
      box: {
        machine: (machine: string) => `planningBox:machine:${machine}`,
        search: (machine: string) => `planningBox:search:${machine}`,
        lastUpdated: "planningBox:lastUpdated",
      },
    },

    manufacture: {
      paper: {
        machine: (machine: string) => `manufacturePaper:machine:${machine}`,
        lastUpdated: "manufacturePaper:lastUpdated",
      },
      box: {
        machine: (machine: string) => `manufactureBox:machine:${machine}`,
        lastUpdated: "manufactureBoxs:lastUpdated",
      },
    },

    report: {
      paper: {
        all: (machine: string, page: number) => `reportPaper:planning:${machine}:${page}`,
        search: (machine: string) => `reportPaper:search:${machine}`,
        lastUpdated: "report:paper:lastUpdated",
      },
      box: {
        all: (machine: string, page: number) => `reportBox:planning:${machine}:${page}`,
        search: (machine: string) => `reportBox:search:${machine}`,
        lastUpdated: "report:box:lastUpdated",
      },
    },
  },

  // Xóa toàn bộ cache theo prefix
  async clearByPrefix(prefix: string) {
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

  async clearOrderAcceptPlanning(role: string) {
    await this.clearByPrefix(`orders:${role}:accept_planning:`);

    // Xoá cache tìm kiếm accept
    await redisCache.del(this.keys.order.searchAcceptPlanning);
  },

  async clearOrderPendingReject(role: string) {
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
  async check(models: any, module: string, options: { setCache?: boolean } = {}) {
    const { setCache = true } = options;

    const map: Record<string, string> = {
      customer: this.keys.customer.lastUpdated,
      product: this.keys.product.lastUpdated,
      employee: this.keys.employee.lastUpdated,

      //order
      orderPending: this.keys.order.lastUpdatedPending,
      orderAccept: this.keys.order.lastUpdatedAccept,

      //planning
      planningOrder: this.keys.planning.order.lastUpdated,
      planningPaper: this.keys.planning.paper.lastUpdated,
      planningOrderPaper: this.keys.planning.paper.lastUpdated, //using for cache planning order
      planningStop: this.keys.planning.stop.lastUpdated,
      planningBox: this.keys.planning.box.lastUpdated,

      //manufacture
      manufacturePaper: this.keys.manufacture.paper.lastUpdated,
      manufactureBox: this.keys.manufacture.box.lastUpdated,

      //report
      reportPaper: this.keys.report.paper.lastUpdated,
      reportBox: this.keys.report.box.lastUpdated,

      //dashboard
      dbPlanning: this.keys.dashboard.planning.lastUpdated,
      dbDetail: this.keys.dashboard.details.lastUpdated,
    };

    const key = map[module];
    if (!key) throw new Error(`Invalid module for checkLastChange: ${module}`);

    const result = await checkLastChange(models, key, { setCache });
    // console.log(`🕒 Cache check [${module}]:`, result);

    return result;
  },
};
