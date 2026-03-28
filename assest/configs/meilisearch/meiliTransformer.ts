export const meiliTransformer = {
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

    return {
      //search
      orderId: raw.orderId,
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
};
