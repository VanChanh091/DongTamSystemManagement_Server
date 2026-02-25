export const CacheKey = {
  order: {
    pendingReject: (role: string) => `orders:${role}:pending_reject`,
    acceptPlanning: (role: string, page: number) => `orders:${role}:accept_planning:page:${page}`,
    searchAcceptPlanning: "orders:accept_planning",
    lastUpdatedPending: "order:pending_reject:lastUpdated",
    lastUpdatedAccept: "order:accept_planning:lastUpdated",
  },

  customer: {
    all: "customers:all",
    page: (page: number) => `customers:page:${page}`,
    search: "customers:search:all",
    lastUpdated: "customer:lastUpdated",
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
      lastUpdated: "planningStop:lastUpdated",
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

  waitingCheck: {
    paper: { all: "waitingCheck:Paper:all", lastUpdated: "checkPaper:lastUpdated" },
    box: { all: "waitingCheck:Box:all", lastUpdated: "checkBox:lastUpdated" },
  },

  warehouse: {
    inbound: {
      page: (page: number) => `inboundHistory:page:${page}`,
      search: (page: number) => `inboundHistory:search:${page}`,
      lastUpdated: "inbound:lastUpdated",
    },
    outbound: {
      page: (page: number) => `outboundHistory:page:${page}`,
      search: (page: number) => `outboundHistory:search:${page}`,
      lastUpdated: "outbound:lastUpdated",
    },
    inventory: {
      page: (page: number) => `inventory:page:${page}`,
      lastUpdated: "inventories:lastUpdated",
    },
  },

  delivery: {
    register: {
      page: (page: number) => `register:page:${page}`,
      lastUpdated: "registerOrder:lastUpdated",
    },
    schedule: {
      date: (date: Date) => `deliverySchedule:date:${date.toISOString()}`,
      lastUpdated: "schedule:lastUpdated",
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
};
