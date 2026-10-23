"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_CONFIG = exports.RequestAction = exports.RequestType = void 0;
var RequestType;
(function (RequestType) {
    // order
    RequestType["ORDER_CHANGE_DATE"] = "ORDER_CHANGE_DATE";
    RequestType["ORDER_CANCEL"] = "ORDER_CANCEL";
    RequestType["ORDER_REJECT"] = "ORDER_REJECT";
    RequestType["ORDER_CONFIRM"] = "ORDER_CONFIRM";
    RequestType["ORDER_UPDATE"] = "ORDER_UPDATE";
    // inspection
    RequestType["INSPECTION_REQUEST"] = "INSPECTION_REQUEST";
    RequestType["INSPECTION_REMIND"] = "INSPECTION_REMIND";
    // debt deduction
    RequestType["DEBT_DEDUCTION_REQUEST"] = "DEBT_DEDUCTION_REQUEST";
    RequestType["DEBT_DEDUCTION_RESUBMITTED"] = "DEBT_DEDUCTION_RESUBMITTED";
    //FORM
    // ... add more request types as needed
})(RequestType || (exports.RequestType = RequestType = {}));
var RequestAction;
(function (RequestAction) {
    RequestAction["REQUEST"] = "REQUEST";
    RequestAction["REJECTED"] = "REJECTED";
    RequestAction["RESPONSE"] = "RESPONSE";
    RequestAction["REMIND"] = "REMIND";
})(RequestAction || (exports.RequestAction = RequestAction = {}));
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
    //inspection
    [RequestType.INSPECTION_REQUEST]: {
        titleCreate: (orderId) => `Có yêu cầu kiểm tra mới từ cho đơn hàng ${orderId}`,
        titleApproved: "Đã nhận thông báo kiểm tra",
        titleRejected: "Từ chối yêu cầu kiểm tra",
    },
    [RequestType.INSPECTION_REMIND]: {
        titleCreate: (payload) => `[Nhắc nhở] Kế hoạch ${payload?.planningId || ""} tại ${payload?.machine || "máy"} sắp hết thời gian tiếp nhận!`,
        titleApproved: "Đã xem",
        titleRejected: "Bỏ qua",
    },
    //debt deduction
    [RequestType.DEBT_DEDUCTION_REQUEST || RequestType.DEBT_DEDUCTION_RESUBMITTED]: {
        titleCreate: () => "Yêu cầu cấn trừ công nợ",
        titleApproved: "Đã duyệt yêu cầu cấn trừ công nợ",
        titleRejected: "Từ chối yêu cầu cấn trừ công nợ",
    },
    [RequestType.DEBT_DEDUCTION_RESUBMITTED]: {
        titleCreate: () => "Yêu cầu cấn trừ công nợ đã được gửi lại",
        titleApproved: "Đã duyệt yêu cầu cấn trừ công nợ",
        titleRejected: "Từ chối yêu cầu cấn trừ công nợ",
    },
};
//# sourceMappingURL=requestType.js.map