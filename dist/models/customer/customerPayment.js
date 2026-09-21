"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerPayment = void 0;
exports.initCustomerPaymentModel = initCustomerPaymentModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class CustomerPayment extends sequelize_1.Model {
}
exports.CustomerPayment = CustomerPayment;
function initCustomerPaymentModel(sequelize) {
    CustomerPayment.init({
        cusPaymentId: {
            type: sequelize_1.DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        closingDays: {
            type: sequelize_1.DataTypes.JSON,
            defaultValue: [],
            comment: "Mảng lưu các ngày chốt nợ. VD: [15, 30] hoặc [0] cho Chủ Nhật",
        },
        paymentTermDays: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Số ngày được nợ thêm kể từ ngày xuất/chốt",
        },
        paymentType: {
            type: sequelize_1.DataTypes.ENUM("daily", "weekly", "monthly", "custom_days"),
            allowNull: false,
            defaultValue: "daily",
        },
        debtCurrent: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        debtLimit: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        //FK
        customerId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "customer_payments",
        timestamps: true,
        indexes: [{ unique: true, fields: ["customerId"] }, { fields: ["paymentType"] }],
    });
    return CustomerPayment;
}
//# sourceMappingURL=customerPayment.js.map