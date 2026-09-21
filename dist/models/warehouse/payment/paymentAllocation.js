"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentAllocation = void 0;
exports.initPaymentAllocationModel = initPaymentAllocationModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PaymentAllocation //Phiếu phân bổ thanh toán của khách hàng
//Phiếu phân bổ thanh toán của khách hàng
 extends sequelize_1.Model {
}
exports.PaymentAllocation = PaymentAllocation;
function initPaymentAllocationModel(sequelize) {
    PaymentAllocation.init({
        allocationId: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        amountAllocation: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        paymentMethod: { type: sequelize_1.DataTypes.STRING, allowNull: false, defaultValue: "MANUAL" },
        //FK
        outboundId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "payment_allocations",
        timestamps: true,
        indexes: [{ fields: ["outboundId"] }],
    });
    return PaymentAllocation;
}
//# sourceMappingURL=paymentAllocation.js.map