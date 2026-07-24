export enum RequestType {
  // order
  ORDER_CHANGE_DATE = "ORDER_CHANGE_DATE",
  ORDER_CANCEL = "ORDER_CANCEL",
  ORDER_REJECT = "ORDER_REJECT",
  ORDER_CONFIRM = "ORDER_CONFIRM",
  ORDER_UPDATE = "ORDER_UPDATE",

  //FORM
  // ... add more request types as needed
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
    titleApproved: "Chấp nhận thay đổi ngày giao hàng",
    titleRejected: "Từ chối thay đổi ngày giao hàng",
  },
  [RequestType.ORDER_CANCEL]: {
    titleCreate: () => "Yêu cầu hủy sản xuất đơn hàng",
    titleApproved: "Chấp nhận hủy sản xuất đơn hàng",
    titleRejected: "Từ chối hủy sản xuất đơn hàng",
  },
  [RequestType.ORDER_REJECT]: {
    titleCreate: () => "Có đơn hàng bị từ chối",
    titleApproved: "Chấp nhận đơn hàng bị từ chối",
    titleRejected: "Từ chối đơn hàng bị từ chối",
  },
  [RequestType.ORDER_CONFIRM]: {
    titleCreate: () => "Xác nhận đơn hàng",
    titleApproved: "Xác nhận",
    titleRejected: "Từ chối",
  },
};
