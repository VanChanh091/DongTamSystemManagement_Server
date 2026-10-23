export enum RequestType {
  // order
  ORDER_CHANGE_DATE = "ORDER_CHANGE_DATE",
  ORDER_CANCEL = "ORDER_CANCEL",
  ORDER_REJECT = "ORDER_REJECT",
  ORDER_CONFIRM = "ORDER_CONFIRM",
  ORDER_UPDATE = "ORDER_UPDATE",

  // inspection
  INSPECTION_REQUEST = "INSPECTION_REQUEST",
  INSPECTION_REMIND = "INSPECTION_REMIND",

  // debt deduction
  DEBT_DEDUCTION_REQUEST = "DEBT_DEDUCTION_REQUEST",
  DEBT_DEDUCTION_RESUBMITTED = "DEBT_DEDUCTION_RESUBMITTED",
  DEBT_DEDUCTION_REJECTED = "DEBT_DEDUCTION_REJECTED",
  DEBT_DEDUCTION_APPROVED = "DEBT_DEDUCTION_APPROVED",
}

export enum RequestAction {
  REQUEST = "REQUEST",
  REJECTED = "REJECTED",
  RESPONSE = "RESPONSE",
  REMIND = "REMIND",
}

export const REQUEST_CONFIG: Record<
  string,
  {
    titleCreate: (payload?: any) => string;
    titleApproved: string;
    titleRejected: string;
  }
> = {
  //order
  [RequestType.ORDER_CHANGE_DATE]: {
    titleCreate: () => "Yêu cầu thay đổi ngày giao hàng",
    titleApproved: "Đã nhận thông báo thay đổi",
    titleRejected: "Từ chối thay đổi ngày giao hàng",
  },
  [RequestType.ORDER_CANCEL]: {
    titleCreate: () => "Yêu cầu hủy sản xuất đơn hàng",
    titleApproved: "Chấp nhận hủy sản xuất đơn hàng",
    titleRejected: "Từ chối hủy sản xuất đơn hàng",
  },
  [RequestType.ORDER_REJECT]: {
    titleCreate: () => "Có đơn hàng bị từ chối",
    titleApproved: "Đã nhận thông báo thay đổi",
    titleRejected: "Từ chối đơn hàng bị từ chối",
  },
  [RequestType.ORDER_CONFIRM]: {
    titleCreate: () => "Xác nhận đơn hàng",
    titleApproved: "Xác nhận",
    titleRejected: "Từ chối",
  },

  //inspection
  [RequestType.INSPECTION_REQUEST]: {
    titleCreate: (orderId: string) => `Có yêu cầu kiểm tra mới từ cho đơn hàng ${orderId}`,
    titleApproved: "Đã nhận thông báo kiểm tra",
    titleRejected: "Từ chối yêu cầu kiểm tra",
  },
  [RequestType.INSPECTION_REMIND]: {
    titleCreate: (payload?: any) =>
      `[Nhắc nhở] Kế hoạch ${payload?.planningId || ""} tại ${payload?.machine || "máy"} sắp hết thời gian tiếp nhận!`,
    titleApproved: "Đã xem",
    titleRejected: "Bỏ qua",
  },

  //debt deduction
  [RequestType.DEBT_DEDUCTION_REQUEST]: {
    titleCreate: () => "Yêu cầu cấn trừ công nợ",
    titleApproved: "Yêu cầu cấn trừ công nợ đã được duyệt",
    titleRejected: "Yêu cầu cấn trừ công nợ đã bị từ chối",
  },
  [RequestType.DEBT_DEDUCTION_RESUBMITTED]: {
    titleCreate: () => "Yêu cầu cấn trừ công nợ đã được gửi lại",
    titleApproved: "Yêu cầu cấn trừ công nợ đã được duyệt",
    titleRejected: "Yêu cầu cấn trừ công nợ đã bị từ chối",
  },
};
