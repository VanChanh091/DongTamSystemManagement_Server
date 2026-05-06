export const meiliTransformer = {
  customer: (customer: any) => {
    const raw = customer.get({ plain: true });

    let dayCreatedTimestamp = null;

    if (raw.dayCreated) {
      const d = new Date(raw.dayCreated);
      d.setUTCHours(0, 0, 0, 0);
      dayCreatedTimestamp = Math.floor(d.getTime() / 1000);
    }

    return {
      ...raw,
      dayCreated: dayCreatedTimestamp,
    };
  },

  employee: (employee: any) => {
    const raw = employee.get({ plain: true });

    return {
      employeeId: raw.employeeId,
      fullName: raw.fullName,
      phoneNumber: raw.phoneNumber,
      employeeCode: raw.companyInfo.employeeCode,
      status: raw.companyInfo.status,
    };
  },

  order: (order: any) => {
    const raw = order.get({ plain: true });

    let dayReceiveOrderTimestamp = null;

    if (raw.dayReceiveOrder) {
      const d = new Date(raw.dayReceiveOrder);
      d.setUTCHours(0, 0, 0, 0);
      dayReceiveOrderTimestamp = Math.floor(d.getTime() / 1000);
    }

    return {
      //search
      orderId: raw.orderId,
      dayReceiveOrder: dayReceiveOrderTimestamp,
      flute: raw.flute,
      QC_box: raw.QC_box,
      price: raw.price,
      customerName: raw.Customer?.customerName,
      productName: raw.Product?.productName,

      //filterable
      status: raw.status,
      userId: raw.userId,
      orderSortValue: raw.orderSortValue,
    };
  },

  planningPaper: (paper: any) => {
    const raw = paper.get({ plain: true });

    return {
      planningId: raw.planningId,
      ghepKho: raw.ghepKho,
      orderId: raw.orderId,
      chooseMachine: raw.chooseMachine,
      status: raw.status,
      customerName: raw.Order?.Customer?.customerName,
      productName: raw.Order?.Product?.productName,
    };
  },

  planningBox: (paper: any) => {
    const raw = paper.get({ plain: true });

    return {
      planningBoxId: raw.planningBoxId,
      orderId: raw.Order?.orderId,
      QC_box: raw.Order?.QC_box,
      customerName: raw.Order?.Customer?.customerName,

      boxTimes: raw.boxTimes.map((boxTime: any) => ({
        machine: boxTime.machine,
        status: boxTime.status,
      })),
    };
  },

  reportPaper: (db: any) => {
    const raw = db.get({ plain: true });

    let dayReportTimestamp = null;

    if (raw.dayReport) {
      const d = new Date(raw.dayReport);
      d.setUTCHours(0, 0, 0, 0);
      dayReportTimestamp = Math.floor(d.getTime() / 1000);
    }

    return {
      reportPaperId: raw.reportPaperId,
      dayReported: dayReportTimestamp,
      shiftManagement: raw.shiftManagement,
      chooseMachine: raw.PlanningPaper?.chooseMachine,
      orderId: raw.PlanningPaper?.Order?.orderId,
      customerName: raw.PlanningPaper?.Order?.Customer?.customerName,
    };
  },

  reportBox: (db: any) => {
    const raw = db.get({ plain: true });

    let dayReportTimestamp = null;

    if (raw.dayReport) {
      const d = new Date(raw.dayReport);
      d.setUTCHours(0, 0, 0, 0);
      dayReportTimestamp = Math.floor(d.getTime() / 1000);
    }

    return {
      reportBoxId: raw.reportBoxId,
      dayReported: dayReportTimestamp,
      shiftManagement: raw.shiftManagement,
      machine: raw.machine,
      orderId: raw.PlanningBox?.Order?.orderId,
      QC_box: raw.PlanningBox?.Order?.QC_box,
      customerName: raw.PlanningBox?.Order?.Customer?.customerName,
    };
  },

  inbound: (db: any) => {
    const raw = db.get({ plain: true });

    let dateInboundTimestamp = null;

    if (raw.dateInbound) {
      const d = new Date(raw.dateInbound);
      d.setUTCHours(0, 0, 0, 0);
      dateInboundTimestamp = Math.floor(d.getTime() / 1000);
    }

    return {
      inboundId: raw.inboundId,
      dateInbound: dateInboundTimestamp,
      orderId: raw.Order?.orderId,
      customerName: raw.Order?.Customer?.customerName,
      checkedBy: raw.QcSession?.checkedBy,
    };
  },

  outbound: (db: any) => {
    const raw = db.get({ plain: true });

    let dateOutboundTimestamp = null;

    if (raw.dateOutbound) {
      const d = new Date(raw.dateOutbound);
      d.setUTCHours(0, 0, 0, 0);
      dateOutboundTimestamp = Math.floor(d.getTime() / 1000);
    }

    return {
      outboundId: raw.outboundId,
      dateOutbound: dateOutboundTimestamp,
      outboundSlipCode: raw.outboundSlipCode,
      status: raw.status,
      customerName: raw.detail?.[0]?.Order?.Customer?.customerName,
    };
  },

  inventory: (db: any) => {
    const raw = db.get({ plain: true });

    return {
      inventoryId: raw.inventoryId,
      qtyInventory: raw.qtyInventory,
      orderId: raw.Order?.orderId,
      customerName: raw.Order?.Customer?.customerName,
    };
  },

  dashboard: (db: any) => {
    const raw = db.get({ plain: true });

    return {
      planningId: raw.planningId,
      ghepKho: raw.ghepKho,
      status: raw.status,
      chooseMachine: raw.chooseMachine,
      orderId: raw.Order?.orderId,
      customerName: raw.Order?.Customer?.customerName,
      companyName: raw.Order?.Customer?.companyName,
      fullName: raw.Order?.User?.fullName,
    };
  },
};
