"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_CONFIG = exports.RequestType = void 0;
var RequestType;
(function (RequestType) {
    // order
    RequestType["ORDER_CHANGE_DATE"] = "ORDER_CHANGE_DATE";
    RequestType["ORDER_CANCEL"] = "ORDER_CANCEL";
    RequestType["ORDER_REJECT"] = "ORDER_REJECT";
    RequestType["ORDER_CONFIRM"] = "ORDER_CONFIRM";
    RequestType["ORDER_UPDATE"] = "ORDER_UPDATE";
    //FORM
    // ... add more request types as needed
})(RequestType || (exports.RequestType = RequestType = {}));
exports.REQUEST_CONFIG = {
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
};
//# sourceMappingURL=requestType.js.map