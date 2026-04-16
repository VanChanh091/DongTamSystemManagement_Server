export const CacheKey = {
  order: {
    pendingReject: (role: string) => `orders:${role}:pending_reject`,
    accept: (role: string, page: number) => `orders:${role}:accept:page:${page}`,
    lastUpdatedPending: "order:pending_reject:lastUpdated",
    lastUpdatedAccept: "order:accept:lastUpdated",
  },

  customer: {
    all: "customers:all",
    page: (page: number) => `customers:page:${page}`,
    lastUpdated: "customer:lastUpdated",
  },

  product: {
    all: "products:all",
    page: (page: number) => `products:page:${page}`,
    lastUpdated: "product:lastUpdated",
  },

  employee: {
    all: "employees:all",
    page: (page: number) => `employees:page:${page}`,
    lastUpdated: "employee:lastUpdated",
  },

  planning: {
    order: {
      all: "orders:status:accept",
      lastUpdated: "orders:accept:lastUpdated",
    },
    paper: {
      machine: (machine: string) => `planningPaper:machine:${machine}`,
      lastUpdated: "planningPaper:lastUpdated",
    },
    stop: {
      page: (page: number) => `planningPaper:stop:page:${page}`,
      lastUpdated: "planningStop:lastUpdated",
    },
    box: {
      machine: (machine: string) => `planningBox:machine:${machine}`,
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

  waitingCheck: {
    paper: { all: "waitingCheck:Paper:all", lastUpdated: "checkPaper:lastUpdated" },
    box: { all: "waitingCheck:Box:all", lastUpdated: "checkBox:lastUpdated" },
  },

  warehouse: {
    inbound: {
      page: (page: number) => `inboundHistory:page:${page}`,
      lastUpdated: "inbound:lastUpdated",
    },
    outbound: {
      page: (page: number) => `outboundHistory:page:${page}`,
      lastUpdated: "outbound:lastUpdated",
    },
    inventory: {
      page: (page: number) => `inventory:page:${page}`,
      lastUpdated: "inventories:lastUpdated",
    },
  },

  delivery: {
    estimate: {
      page: (page: number) => `estimate:page:${page}`,
      lastUpdated: "estimateOrder:lastUpdated",
    },
    schedule: {
      date: (date: Date) => `schedule:date:${date.toISOString()}`,
      lastUpdated: "scheduleOrder:lastUpdated",
    },
  },

  report: {
    paper: {
      all: (machine: string, page: number) => `reportPaper:planning:${machine}:${page}`,
      lastUpdated: "report:paper:lastUpdated",
    },
    box: {
      all: (machine: string, page: number) => `reportBox:planning:${machine}:${page}`,
      lastUpdated: "report:box:lastUpdated",
    },
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
  },
};
