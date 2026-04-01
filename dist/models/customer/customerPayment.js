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
        debtCurrent: { type: sequelize_1.DataTypes.DOUBLE },
        debtLimit: { type: sequelize_1.DataTypes.DOUBLE },
        timePayment: { type: sequelize_1.DataTypes.DATE },
        paymentType: { type: sequelize_1.DataTypes.ENUM("daily", "monthly"), allowNull: false },
        closingDate: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        //FK
        customerId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "CustomerPayments",
        timestamps: true,
        indexes: [
            { unique: true, fields: ["customerId"] },
            { fields: ["paymentType"] },
            { fields: ["closingDate"] },
        ],
    });
    return CustomerPayment;
}
//# sourceMappingURL=customerPayment.js.map